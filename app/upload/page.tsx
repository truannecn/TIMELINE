"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type WorkType = "image" | "essay";

export default function NewWorkPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [workType, setWorkType] = useState<WorkType>("image");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState(""); // Essay content
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    setContent("");
    setError(null);
  };

  const handleWorkTypeChange = (newType: WorkType) => {
    if (newType !== workType) {
      resetForm();
      setWorkType(newType);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError(workType === "image" ? "Please select an image" : "Please select a cover image");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (workType === "essay" && !content.trim()) {
      setError("Please enter your essay content");
      return;
    }

    if (workType === "essay" && content.trim().length < 100) {
      setError("Essays must be at least 100 characters");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to upload");
        return;
      }

      // Validate image with AI detection
      setValidating(true);
      const validateForm = new FormData();
      validateForm.append("file", file);

      const validateResponse = await fetch("/api/validate-image", {
        method: "POST",
        body: validateForm,
      });

      const validateResult = await validateResponse.json();

      if (!validateResponse.ok) {
        setValidating(false);
        throw new Error(validateResult.error || "Failed to validate image");
      }

      if (!validateResult.passed) {
        setValidating(false);
        setError(
          `This image appears to be AI-generated (confidence: ${Math.round(validateResult.score * 100)}%). Artfolio only accepts human-created artwork.`
        );
        setUploading(false);
        return;
      }

      // For essays, also validate the text content
      if (workType === "essay") {
        const textValidateResponse = await fetch("/api/validate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content.trim() }),
        });

        const textValidateResult = await textValidateResponse.json();

        if (!textValidateResponse.ok) {
          setValidating(false);
          throw new Error(textValidateResult.error || "Failed to validate text");
        }

        if (!textValidateResult.passed) {
          setValidating(false);
          setError(
            `This essay appears to be AI-generated (confidence: ${Math.round(textValidateResult.score * 100)}%). Artfolio only accepts human-written content.`
          );
          setUploading(false);
          return;
        }
      }

      setValidating(false);

      // Upload image
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("artworks")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("artworks").getPublicUrl(filePath);

      // Get image dimensions
      const img = new Image();
      img.src = preview!;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Insert into works table
      const workData: Record<string, unknown> = {
        author_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        image_path: filePath,
        image_url: publicUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
        work_type: workType,
      };

      if (workType === "essay") {
        workData.content = content.trim();
      }

      const { error: insertError } = await supabase.from("works").insert(workData);

      if (insertError) {
        await supabase.storage.from("artworks").remove([filePath]);
        throw insertError;
      }

      router.push("/feed");
      router.refresh();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Artfolio
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/feed"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Feed
            </Link>
            <Link
              href="/profile"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">New Work</h1>

        {/* Work Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleWorkTypeChange("image")}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                workType === "image"
                  ? "bg-foreground text-background"
                  : "border border-border hover:bg-muted"
              }`}
            >
              Image
            </button>
            <button
              type="button"
              onClick={() => handleWorkTypeChange("essay")}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                workType === "essay"
                  ? "bg-foreground text-background"
                  : "border border-border hover:bg-muted"
              }`}
            >
              Essay
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image upload area */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {workType === "image" ? "Artwork" : "Cover Image"}
              {workType === "essay" && (
                <span className="text-muted-foreground font-normal ml-1">
                  (required for essays)
                </span>
              )}
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                preview
                  ? "border-border"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              {preview ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded"
                  />
                  <p className="text-sm text-muted-foreground">
                    Click to change image
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">{workType === "image" ? "🎨" : "📝"}</div>
                  <p className="text-muted-foreground">
                    Click to select {workType === "image" ? "an image" : "a cover image"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    JPEG, PNG, GIF, or WebP • Max 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={workType === "image" ? "Give your artwork a title" : "Essay title"}
              className="w-full px-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
              maxLength={200}
            />
          </div>

          {/* Description (for images) or hidden for essays */}
          {workType === "image" && (
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us about this piece..."
                rows={3}
                className="w-full px-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
              />
            </div>
          )}

          {/* Essay content */}
          {workType === "essay" && (
            <div>
              <label htmlFor="content" className="block text-sm font-medium mb-2">
                Essay Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste or write your essay here..."
                rows={12}
                className="w-full px-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-y font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {content.length.toLocaleString()} characters
                {content.length < 100 && content.length > 0 && (
                  <span className="text-amber-600 ml-2">
                    (minimum 100)
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={uploading || validating || !file}
            className="w-full py-3 bg-foreground text-background rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {validating
              ? workType === "essay"
                ? "Checking image & text for AI content..."
                : "Checking for AI content..."
              : uploading
                ? "Publishing..."
                : workType === "image"
                  ? "Upload Artwork"
                  : "Publish Essay"}
          </button>
        </form>
      </main>
    </div>
  );
}
