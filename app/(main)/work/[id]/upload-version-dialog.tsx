"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadFileWithPresignedUrl } from "@/lib/amplify/storage";
import { createWorkVersion } from "./version-actions";
import { WorkType } from "@/lib/api/types";

interface UploadVersionDialogProps {
  workId: string;
  workType: WorkType;
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadVersionDialog({
  workId,
  workType,
  isOpen,
  onClose,
}: UploadVersionDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [content, setContent] = useState(""); // For essay versions
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setNotes("");
    setContent("");
    setError(null);
    setProgress("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    if (!uploading && !validating) {
      resetForm();
      onClose();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (workType === "image") {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(selectedFile.type)) {
        setError("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Please enter a version title");
      return;
    }

    if (workType === "image" && !file) {
      setError("Please select an image file");
      return;
    }

    if (workType === "essay" && !content.trim()) {
      setError("Please enter the essay content for this version");
      return;
    }

    if (workType === "essay" && content.trim().length < 100) {
      setError("Essay content must be at least 100 characters");
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
        setError("You must be logged in to upload versions");
        return;
      }

      // Get next version number from API
      setProgress("Preparing version...");
      const versionResponse = await fetch(`/api/works/${workId}/upload-version`, {
        method: "POST",
      });

      const versionData = await versionResponse.json();

      if (!versionResponse.ok) {
        throw new Error(versionData.error || "Failed to prepare version");
      }

      const versionNumber = versionData.version_number;

      // Validate content with AI detection
      setValidating(true);
      setProgress("Validating content...");

      if (workType === "image" && file) {
        // Validate image
        const validateForm = new FormData();
        validateForm.append("file", file);

        const validateResponse = await fetch("/api/validate-image", {
          method: "POST",
          body: validateForm,
        });

        const validateResult = await validateResponse.json();

        if (!validateResponse.ok) {
          throw new Error(validateResult.error || "Failed to validate image");
        }

        if (!validateResult.passed) {
          setError(
            `This image appears to be AI-generated (confidence: ${Math.round(validateResult.score * 100)}%). All versions must be human-created.`
          );
          setValidating(false);
          setUploading(false);
          return;
        }
      }

      if (workType === "essay") {
        // Validate text content
        const textValidateResponse = await fetch("/api/validate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content.trim() }),
        });

        const textValidateResult = await textValidateResponse.json();

        if (!textValidateResponse.ok) {
          throw new Error(textValidateResult.error || "Failed to validate text");
        }

        if (!textValidateResult.passed) {
          setError(
            `This text appears to be AI-generated (confidence: ${Math.round(textValidateResult.score * 100)}%). All versions must be human-created.`
          );
          setValidating(false);
          setUploading(false);
          return;
        }
      }

      setValidating(false);

      // Upload image to S3 if this is an image version
      let imageUrl: string | null = null;
      let imagePath: string | null = null;
      let width: number | null = null;
      let height: number | null = null;

      if (workType === "image" && file) {
        setProgress("Uploading image...");

        // Get image dimensions
        const img = new Image();
        const imageDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        await new Promise<void>((resolve) => {
          img.onload = () => {
            width = img.width;
            height = img.height;
            resolve();
          };
          img.src = imageDataUrl;
        });

        // Upload file using Amplify storage (returns path and public URL)
        const uploadResult = await uploadFileWithPresignedUrl(file);
        imagePath = uploadResult.path;
        imageUrl = uploadResult.url;
      }

      // Save version to database
      setProgress("Saving version...");
      const result = await createWorkVersion({
        work_id: workId,
        version_number: versionNumber,
        title: title.trim(),
        notes: notes.trim() || null,
        image_path: imagePath || undefined,
        image_url: imageUrl || undefined,
        width: width || undefined,
        height: height || undefined,
        content: workType === "essay" ? content.trim() : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to save version");
      }

      // Success - close dialog and reset form
      resetForm();
      onClose();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload version");
    } finally {
      setUploading(false);
      setValidating(false);
      setProgress("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif">Upload Previous Version</h2>
            <button
              onClick={handleClose}
              disabled={uploading || validating}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Version Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Version Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Early Sketch, First Draft, Color Study"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                disabled={uploading || validating}
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe what changed in this iteration..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                disabled={uploading || validating}
              />
            </div>

            {/* Image Upload (for image works) */}
            {workType === "image" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image File *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  disabled={uploading || validating}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
                {preview && (
                  <div className="mt-4">
                    <img src={preview} alt="Preview" className="max-h-64 rounded-lg" />
                  </div>
                )}
              </div>
            )}

            {/* Essay Content (for essay works) */}
            {workType === "essay" && (
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Essay Content * (min 100 characters)
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste the content of this version..."
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent font-mono text-sm"
                  disabled={uploading || validating}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {content.length} characters
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Progress Message */}
            {progress && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
                {progress}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={uploading || validating}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || validating}
                className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading || validating ? "Uploading..." : "Upload Version"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
