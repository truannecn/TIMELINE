"use client";

import { useState } from "react";
import { WorkVersion, WorkType } from "@/lib/api/types";
import VersionHistory from "./version-history";
import UploadVersionDialog from "./upload-version-dialog";

interface VersionHistorySectionProps {
  workId: string;
  workType: WorkType;
  versions: WorkVersion[];
  isOwner: boolean;
}

export function VersionHistorySection({
  workId,
  workType,
  versions,
  isOwner,
}: VersionHistorySectionProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  return (
    <div className="mt-12 pt-8 border-t border-black/10">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setShowVersions(!showVersions)}
          className="flex items-center gap-2 text-lg font-medium hover:text-black/60 transition-colors"
        >
          <svg
            className={`w-5 h-5 transition-transform ${showVersions ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          Version History
          {versions.length > 0 && (
            <span className="px-2 py-0.5 bg-black/5 text-black/60 text-sm rounded-full">
              {versions.length}
            </span>
          )}
        </button>

        {isOwner && (
          <button
            onClick={() => setShowUploadDialog(true)}
            className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-black/90 transition-colors"
          >
            + Upload Previous Version
          </button>
        )}
      </div>

      {showVersions && (
        <div className="mt-6">
          <VersionHistory versions={versions} workType={workType} isOwner={isOwner} />
        </div>
      )}

      <UploadVersionDialog
        workId={workId}
        workType={workType}
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
      />
    </div>
  );
}
