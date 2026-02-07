"use client";

import { useState, useTransition, useRef, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadFileWithPresignedUrl } from "@/lib/amplify/storage";
import { createThread } from "./actions";

export default function CreateThreadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setPhotoFile(file);
    setError("");

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to AWS immediately
    setUploadingPhoto(true);
    try {
      const uploadResult = await uploadFileWithPresignedUrl(file);
      setPhotoUrl(uploadResult.url);
    } catch (uploadError) {
      setError(
        `Failed to upload photo: ${
          uploadError instanceof Error ? uploadError.message : "Unknown error"
        }`
      );
      setPhotoFile(null);
      setPhotoPreview("");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoUrl("");
    setPhotoPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Thread name is required");
      return;
    }

    startTransition(() => {
      void (async () => {
        const result = await createThread(name.trim(), description.trim(), photoUrl || null);

        if (!result.success) {
          setError(result.error || "Failed to create thread");
        } else if (result.threadId) {
          router.push(`/thread/${result.threadId}`);
        }
      })();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photo Upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          disabled={isPending}
          className="hidden"
        />
        {photoPreview ? (
          <div className="relative inline-block">
            <img
              src={photoPreview}
              alt="Thread photo"
              className="h-28 w-28 rounded-lg object-cover border border-black/20"
            />
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={isPending}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending || uploadingPhoto}
            className="flex flex-col items-center justify-center h-28 w-28 rounded-lg border-2 border-dashed border-black/20 bg-black/2 hover:bg-black/5 transition-colors disabled:opacity-50"
          >
            {uploadingPhoto ? (
              <>
                <span className="text-2xl mb-1">⏳</span>
                <span className="text-xs text-black/60 font-medium">Uploading...</span>
              </>
            ) : (
              <>
                <span className="text-2xl mb-1">📷</span>
                <span className="text-xs text-black/60 font-medium">Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-black/70 mb-2">
          Thread name *
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="w-full rounded-lg border border-black/20 px-4 py-2 text-sm focus:border-black/40 focus:outline-none"
          placeholder="e.g., Pixel Art, Urban Sketching, Fan Art"
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-black/70 mb-2">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={4}
          className="w-full rounded-lg border border-black/20 px-4 py-2 text-sm focus:border-black/40 focus:outline-none resize-none"
          placeholder="What kind of work belongs in this thread?"
          disabled={isPending}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-black/20 px-6 py-2 text-sm hover:bg-black/5 transition-colors"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-black px-6 py-2 text-sm text-white hover:bg-black/90 transition-colors disabled:opacity-50"
        >
          {isPending ? "Creating..." : "Create thread"}
        </button>
      </div>
    </form>
  );
}
