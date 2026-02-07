"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadFileWithPresignedUrl, deleteFile } from "@/lib/amplify/storage";
import ImageEditor from "@/app/components/image-editor";
import {
  ImageFilters,
  getDefaultFilters,
  applyFiltersToFile,
} from "@/lib/image-filters";

interface Thread {
  id: string;
  name: string;
}

export default function NewWorkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [filters, setFilters] = useState<ImageFilters[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());
  const [primaryThread, setPrimaryThread] = useState<string | null>(null);

  // Fetch threads on mount
  useEffect(() => {
    async function fetchThreads() {
      const { data } = await supabase
        .from("threads")
        .select("id, name")
        .order("name");

      if (data) {
        setThreads(data);
      }
    }
    fetchThreads();
  }, [supabase]);

  function toggleThread(threadId: string) {
    setSelectedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
        if (primaryThread === threadId) {
          setPrimaryThread(null);
        }
      } else {
        next.add(threadId);
        if (next.size === 1) {
          setPrimaryThread(threadId);
        }
      }
      return next;
    });
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const maxFiles = 10;

    // Validate number of files
    if (selectedFiles.length > maxFiles) {
      setError(`You can upload up to ${maxFiles} images`);
      return;
    }

    // Validate each file
    for (const file of selectedFiles) {
      if (!validTypes.includes(file.type)) {
        setError("Please select valid image files (JPEG, PNG, GIF, or WebP)");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("Each file must be less than 10MB");
        return;
      }
    }

    setFiles(selectedFiles);
    setError(null);

    // Create preview for each file
    const newPreviews: string[] = [];
    const newFilters: ImageFilters[] = [];
    let loaded = 0;

    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        newFilters.push(getDefaultFilters());
        loaded++;

        if (loaded === selectedFiles.length) {
          setPreviews(newPreviews);
          setFilters(newFilters);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const resetForm = () => {
    setFiles([]);
    setPreviews([]);
    setFilters([]);
    setShowEditor(false);
    setTitle("");
    setDescription("");
    setError(null);
    setSelectedThreads(new Set());
    setPrimaryThread(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      setError("Please select at least one image");
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

    if (selectedThreads.size === 0) {
      setError("Please select at least one category");

      return;
    }

    if (!primaryThread) {
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

      // Validate all images with AI detection
      setValidating(true);
      for (let i = 0; i < files.length; i++) {
        const validateForm = new FormData();
        validateForm.append("file", files[i]);

        const validateResponse = await fetch("/api/validate-image", {
          method: "POST",
          body: validateForm,
        });

        const validateResult = await validateResponse.json();

        if (!validateResponse.ok) {
          setValidating(false);
          throw new Error(validateResult.error || `Failed to validate image ${i + 1}`);
        }

        if (!validateResult.passed) {
          setValidating(false);
          setError(
            `Image ${i + 1} appears to be AI-generated (confidence: ${Math.round(validateResult.score * 100)}%). Artfolio only accepts human-created artwork.`
          );
          setUploading(false);
          return;
        }
      }

      setValidating(false);

      // Apply filters and upload all images
      const uploadedImages: Array<{
        path: string;
        url: string;
        width: number;
        height: number;
      }> = [];

      for (let i = 0; i < files.length; i++) {
        // Apply filters to the file
        const filteredFile = await applyFiltersToFile(files[i], filters[i]);

        // Upload the filtered image
        let uploadResult;
        try {
          uploadResult = await uploadFileWithPresignedUrl(filteredFile);
        } catch (uploadError) {
          throw new Error(
            uploadError instanceof Error
              ? uploadError.message
              : `Failed to upload image ${i + 1}`
          );
        }

        // Get image dimensions
        const img = new Image();
        img.src = previews[i];
        const dimensions = await new Promise<{ width: number; height: number }>(
          (resolve) => {
            img.onload = () => {
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
          }
        );

        uploadedImages.push({
          path: uploadResult.path,
          url: uploadResult.url,
          width: dimensions.width,
          height: dimensions.height,
        });
      }

      // First image is the cover image
      const coverImage = uploadedImages[0];
      const additionalImages = uploadedImages.slice(1);

      // Insert into works table
      const workData: Record<string, unknown> = {
        author_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        image_path: coverImage.path,
        image_url: coverImage.url,
        width: coverImage.width,
        height: coverImage.height,
        work_type: "image",
      };

      const { data: insertedWork, error: insertError } = await supabase
        .from("works")
        .insert(workData)
        .select("id")
        .single();

      if (insertError || !insertedWork) {
        // Clean up uploaded files if database insert fails
        for (const img of uploadedImages) {
          try {
            await deleteFile(img.path);
          } catch {
            console.error("Failed to clean up uploaded file:", img.path);
          }
        }
        throw insertError || new Error("Failed to create work");
      }

      // Update work with primary thread
      if (primaryThread) {
        const { error: primaryError } = await supabase
          .from("works")
          .update({ primary_thread_id: primaryThread })
          .eq("id", insertedWork.id);

        if (primaryError) {
          console.error("Failed to save primary thread:", primaryError);
        }
      }

      // Insert work-thread associations
      if (selectedThreads.size > 0) {
        const workThreads = Array.from(selectedThreads).map((threadId) => ({
          work_id: insertedWork.id,
          thread_id: threadId,
        }));

        const { error: threadsError } = await supabase
          .from("work_threads")
          .insert(workThreads);

        if (threadsError) {
          console.error("Failed to save work threads:", threadsError);
        }
      }

      // Insert additional images into work_images table
      if (additionalImages.length > 0) {
        const workImages = additionalImages.map((img, index) => ({
          work_id: insertedWork.id,
          image_path: img.path,
          image_url: img.url,
          width: img.width,
          height: img.height,
          display_order: index + 1, // Start from 1 since cover is 0
        }));

        const { error: imagesError } = await supabase
          .from("work_images")
          .insert(workImages);

        if (imagesError) {
          console.error("Failed to save additional images:", imagesError);
        }
      }

      // Insert additional images into work_images table
      if (additionalImages.length > 0) {
        const workImages = additionalImages.map((img, index) => ({
          work_id: insertedWork.id,
          image_path: img.path,
          image_url: img.url,
          width: img.width,
          height: img.height,
          display_order: index + 1, // Start from 1 since cover is 0
        }));

        const { error: imagesError } = await supabase
          .from("work_images")
          .insert(workImages);

        if (imagesError) {
          console.error("Failed to save additional images:", imagesError);
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
      <h1 className="text-2xl font-bold mb-6">Upload Artwork</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image upload area */}
        <div>
          <label className="block text-sm font-medium mb-2">Artwork</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              previews.length > 0
                ? "border-border"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {previews.length > 0 ? (
              <div className="space-y-4">
                {/* Show thumbnails of all images */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {previews.map((previewUrl, index) => (
                    <img
                      key={index}
                      src={previewUrl}
                      alt={`Preview ${index + 1}`}
                      className="h-32 w-32 object-cover rounded border border-border"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {previews.length} image{previews.length > 1 ? "s" : ""} selected • Click to change
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-4xl">🎨</div>
                <p className="text-muted-foreground">
                  Click to select image(s)
                </p>
                <p className="text-sm text-muted-foreground">
                  JPEG, PNG, GIF, or WebP • Max 10MB each • Up to 10 images
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Edit button */}
        {previews.length > 0 && !showEditor && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowEditor(true)}
              className="px-6 py-2 border border-border rounded-md hover:bg-muted transition-colors text-sm font-medium"
            >
              Edit Images
            </button>
          </div>
        )}

        {/* Image Editor */}
        {showEditor && (
          <ImageEditor
            files={files}
            previews={previews}
            filters={filters}
            onFiltersChange={(index, newFilters) => {
              const updatedFilters = [...filters];
              updatedFilters[index] = newFilters;
              setFilters(updatedFilters);
            }}
            onDone={() => setShowEditor(false)}
            onBack={() => setShowEditor(false)}
          />
        )}

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
            placeholder="Give your artwork a title"
            className="w-full px-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
            maxLength={200}
          />
        </div>

        {/* Caption */}
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

        {/* Interest categories */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Categories
            <span className="text-muted-foreground font-normal ml-1">
              (select at least 1, click ⭐ to set primary)
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {threads.map((thread) => {
              const isSelected = selectedThreads.has(thread.id);
              const isPrimary = primaryThread === thread.id;
              return (
                <div key={thread.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleThread(thread.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      isSelected
                        ? "bg-foreground text-background"
                        : "border border-border hover:bg-muted"
                    }`}
                  >
                    {thread.name}
                  </button>
                  {isSelected && (
                    <button
                      type="button"
                      onClick={() => setPrimaryThread(thread.id)}
                      className={`text-lg transition-colors ${
                        isPrimary ? "opacity-100" : "opacity-30 hover:opacity-60"
                      }`}
                      aria-label="Set as primary thread"
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
          disabled={uploading || validating || !file || selectedThreads.size === 0}
          className="w-full py-3 bg-foreground text-background rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {validating
            ? "Checking for AI content..."
            : uploading
              ? "Uploading..."
              : "Upload Artwork"}
        </button>
      </form>
    </div>
  );
}
