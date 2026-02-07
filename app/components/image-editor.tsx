"use client";

import { useState } from "react";
import {
  ImageFilters,
  buildCssFilterString,
  getDefaultFilters,
} from "@/lib/image-filters";

interface ImageEditorProps {
  files: File[];
  previews: string[];
  filters: ImageFilters[];
  onFiltersChange: (index: number, filters: ImageFilters) => void;
  onDone: () => void;
  onBack: () => void;
}

export default function ImageEditor({
  files,
  previews,
  filters,
  onFiltersChange,
  onDone,
  onBack,
}: ImageEditorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentFilters = filters[currentIndex] || getDefaultFilters();
  const currentPreview = previews[currentIndex];

  const handleFilterChange = (key: keyof ImageFilters, value: number) => {
    const newFilters = { ...currentFilters, [key]: value };
    onFiltersChange(currentIndex, newFilters);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : previews.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < previews.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden shadow-lg">
      <div className="flex flex-col md:flex-row">
        {/* Left column: Image preview with carousel */}
        <div className="relative md:w-3/5 bg-muted flex items-center justify-center min-h-[400px] p-4">
          <img
            src={currentPreview}
            alt={`Preview ${currentIndex + 1}`}
            className="max-h-[500px] max-w-full object-contain rounded"
            style={{
              filter: buildCssFilterString(currentFilters),
              transition: "filter 0.1s ease-out",
            }}
          />

          {/* Navigation arrows (only show if multiple images) */}
          {previews.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-lg transition-colors"
                aria-label="Previous image"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-lg transition-colors"
                aria-label="Next image"
              >
                <svg
                  className="w-6 h-6"
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
              </button>

              {/* Dot indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {previews.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? "bg-foreground w-6"
                        : "bg-muted-foreground/50 hover:bg-muted-foreground"
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right column: Controls */}
        <div className="md:w-2/5 p-6 flex flex-col">
          {/* Top row: back arrow and Done button */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={onBack}
              className="p-2 hover:bg-muted rounded transition-colors"
              aria-label="Back"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={onDone}
              className="px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>

          <hr className="border-border mb-4" />

          {/* Edit label */}
          <h3 className="text-lg font-semibold mb-6">Edit</h3>

          {/* Sliders */}
          <div className="space-y-6 flex-1">
            {/* Brightness */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Brightness</label>
                <span className="text-sm text-muted-foreground">
                  {currentFilters.brightness}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={currentFilters.brightness}
                onChange={(e) =>
                  handleFilterChange("brightness", Number(e.target.value))
                }
                className="w-full accent-foreground"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Contrast</label>
                <span className="text-sm text-muted-foreground">
                  {currentFilters.contrast}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={currentFilters.contrast}
                onChange={(e) =>
                  handleFilterChange("contrast", Number(e.target.value))
                }
                className="w-full accent-foreground"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Saturation</label>
                <span className="text-sm text-muted-foreground">
                  {currentFilters.saturation}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={currentFilters.saturation}
                onChange={(e) =>
                  handleFilterChange("saturation", Number(e.target.value))
                }
                className="w-full accent-foreground"
              />
            </div>

            {/* Warmth */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Warmth</label>
                <span className="text-sm text-muted-foreground">
                  {currentFilters.warmth}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={currentFilters.warmth}
                onChange={(e) =>
                  handleFilterChange("warmth", Number(e.target.value))
                }
                className="w-full accent-foreground"
              />
            </div>

            {/* Reset button */}
            <button
              type="button"
              onClick={() => onFiltersChange(currentIndex, getDefaultFilters())}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
