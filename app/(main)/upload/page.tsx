"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadFileWithPresignedUrl, deleteFile } from "@/lib/amplify/storage";

type WorkType = "image" | "essay";

interface Interest {
  id: string;
  name: string;
  slug: string;
}

export default function NewWorkPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const [workType, setWorkType] = useState<WorkType>("image");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState(""); // Essay content
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());
  const [primaryInterest, setPrimaryInterest] = useState<string | null>(null);

  // Fetch interests on mount
  useEffect(() => {
    async function fetchInterests() {
      const { data } = await supabase
        .from("interests")
        .select("id, name, slug")
        .order("name");

      if (data) {
        setInterests(data);
      }
    }
    fetchInterests();
  }, [supabase]);

  function toggleInterest(interestId: string) {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      if (next.has(interestId)) {
        next.delete(interestId);
        // Clear primary if deselecting the primary interest
        if (primaryInterest === interestId) {
          setPrimaryInterest(null);
        }
      } else {
        next.add(interestId);
        // Auto-set as primary if it's the first one
        if (next.size === 1) {
          setPrimaryInterest(interestId);
        }
      }
      return next;
    });
  }

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
    setSelectedInterests(new Set());
    setPrimaryInterest(null);
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

    if (selectedInterests.size === 0) {
      setError("Please select at least one interest category");
      return;
    }

    if (!primaryInterest) {
      setError("Please select a primary category by clicking the star icon");
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

      // Upload image using pre-signed URL
      let uploadResult;
      try {
        uploadResult = await uploadFileWithPresignedUrl(file);
      } catch (uploadError) {
        throw new Error(
          uploadError instanceof Error
            ? uploadError.message
            : "Failed to upload image"
        );
      }

      const filePath = uploadResult.path;
      const publicUrl = uploadResult.url;

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

      const { data: insertedWork, error: insertError } = await supabase
        .from("works")
        .insert(workData)
        .select("id")
        .single();

      if (insertError || !insertedWork) {
        // Clean up uploaded file if database insert fails
        try {
          await deleteFile(filePath);
        } catch {
          console.error("Failed to clean up uploaded file");
        }
        throw insertError || new Error("Failed to create work");
      }

      // Update work with primary thread
      if (primaryInterest) {
        const { error: primaryError } = await supabase
          .from("works")
          .update({ primary_thread_id: primaryInterest })
          .eq("id", insertedWork.id);

        if (primaryError) {
          console.error("Failed to save primary thread:", primaryError);
        }
      }

      // Insert work interests
      if (selectedInterests.size > 0) {
        const workInterests = Array.from(selectedInterests).map((interestId) => ({
          work_id: insertedWork.id,
          interest_id: interestId,
        }));

        const { error: interestsError } = await supabase
          .from("work_interests")
          .insert(workInterests);

        if (interestsError) {
          console.error("Failed to save work interests:", interestsError);
        }
      }

      router.push("/explore");
      router.refresh();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
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

        {/* Caption (for images) or hidden for essays */}
        {workType === "image" && (
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Caption (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about this piece..."
              rows={3}
              maxLength={300}
              className="w-full px-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {description.length}/300
            </p>
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

        {/* Interest categories */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Categories
            <span className="text-muted-foreground font-normal ml-1">
              (select at least 1, click ⭐ to set primary)
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => {
              const isSelected = selectedInterests.has(interest.id);
              const isPrimary = primaryInterest === interest.id;
              return (
                <div key={interest.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      isSelected
                        ? "bg-foreground text-background"
                        : "border border-border hover:bg-muted"
                    }`}
                  >
                    {interest.name}
                  </button>
                  {isSelected && (
                    <button
                      type="button"
                      onClick={() => setPrimaryInterest(interest.id)}
                      className={`text-lg transition-colors ${
                        isPrimary ? "opacity-100" : "opacity-30 hover:opacity-60"
                      }`}
                      aria-label="Set as primary interest"
                      title="Set as primary category"
                    >
                      {isPrimary ? "⭐" : "☆"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={uploading || validating || !file || selectedInterests.size === 0}
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
    </div>
  );
}
