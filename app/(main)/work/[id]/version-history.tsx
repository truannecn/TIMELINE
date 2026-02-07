"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { WorkVersion, WorkType } from "@/lib/api/types";
import { deleteVersion } from "./version-actions";
import { deleteFile } from "@/lib/amplify/storage";

interface VersionHistoryProps {
  versions: WorkVersion[];
  workType: WorkType;
  isOwner: boolean;
}

export default function VersionHistory({
  versions,
  workType,
  isOwner,
}: VersionHistoryProps) {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = (versionId: string) => {
    if (!confirm("Are you sure you want to delete this version? This cannot be undone.")) {
      return;
    }

    setDeletingId(versionId);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const result = await deleteVersion(versionId);

          if (!result.success) {
            setError(result.error || "Failed to delete version");
            setDeletingId(null);
            return;
          }

          // Delete image file from S3 if it exists
          if (result.image_path) {
            try {
              await deleteFile(result.image_path);
            } catch (err) {
              console.error("Failed to delete image file:", err);
              // Don't show error to user - DB record is deleted which is more important
            }
          }

          setDeletingId(null);
        } catch (err) {
          console.error("Delete error:", err);
          setError(err instanceof Error ? err.message : "Failed to delete version");
          setDeletingId(null);
        }
      })();
    });
  };

  if (versions.length === 0) {
    return (
      <div className="text-center py-12 bg-black/5 rounded-lg">
        <svg
          className="w-16 h-16 text-black/20 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        <h3 className="text-lg font-medium text-black/70 mb-2">No previous versions yet</h3>
        <p className="text-black/50">
          {isOwner
            ? "Upload previous drafts to show your creative process"
            : "The artist hasn't shared previous versions of this work"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {versions.map((version) => (
          <div
            key={version.id}
            className="border border-black/10 rounded-xl p-6 bg-white hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-black/5 text-black/60 text-sm font-medium rounded-full">
                    Version {version.version_number}
                  </span>
                  <h3 className="text-xl font-bold">{version.title}</h3>
                </div>
                {version.notes && (
                  <p className="text-black/60 text-sm leading-relaxed">{version.notes}</p>
                )}
                <p className="text-xs text-black/40 mt-2">
                  Uploaded {new Date(version.created_at).toLocaleDateString()}
                </p>
              </div>

              {isOwner && (
                <button
                  onClick={() => handleDelete(version.id)}
                  disabled={deletingId === version.id || isPending}
                  className="ml-4 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete version"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Image Preview */}
            {workType === "image" && version.image_url && (
              <div className="mt-4">
                <div className="relative rounded-lg overflow-hidden bg-black/5">
                  <Image
                    src={version.image_url}
                    alt={version.title}
                    width={version.width || 800}
                    height={version.height || 600}
                    className="w-full h-auto"
                    priority={false}
                  />
                </div>
              </div>
            )}

            {/* Essay Excerpt */}
            {workType === "essay" && version.content && (
              <div className="mt-4 p-4 bg-black/5 rounded-lg">
                <p className="text-sm text-black/70 line-clamp-4 leading-relaxed">
                  {version.content}
                </p>
                {version.content.length > 200 && (
                  <p className="text-xs text-black/40 mt-2">
                    {version.content.length} characters
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
