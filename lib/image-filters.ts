export interface ImageFilters {
  brightness: number; // 0-200, default 100
  contrast: number; // 0-200, default 100
  saturation: number; // 0-200, default 100
  warmth: number; // -100 to 100, default 0
}

export function getDefaultFilters(): ImageFilters {
  return {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    warmth: 0,
  };
}

/**
 * Builds a CSS filter string from ImageFilters for real-time preview
 */
export function buildCssFilterString(filters: ImageFilters): string {
  const parts: string[] = [];

  // Brightness and contrast use values as percentages (100 = 1.0)
  if (filters.brightness !== 100) {
    parts.push(`brightness(${filters.brightness / 100})`);
  }

  if (filters.contrast !== 100) {
    parts.push(`contrast(${filters.contrast / 100})`);
  }

  if (filters.saturation !== 100) {
    parts.push(`saturate(${filters.saturation / 100})`);
  }

  // Warmth is simulated using sepia + hue-rotate
  // Positive warmth = more sepia (warmer), negative = cooler tones
  if (filters.warmth !== 0) {
    const warmthIntensity = Math.abs(filters.warmth) / 100;
    if (filters.warmth > 0) {
      // Warmer: use sepia
      parts.push(`sepia(${warmthIntensity * 0.4})`);
    } else {
      // Cooler: use hue-rotate towards blue
      parts.push(`hue-rotate(${filters.warmth * 0.5}deg)`);
    }
  }

  return parts.join(" ");
}

/**
 * Applies filters to a file by drawing to canvas and baking the filters in.
 * Returns a new File with the filters permanently applied.
 */
export async function applyFiltersToFile(
  file: File,
  filters: ImageFilters
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Apply CSS filters to canvas context
        ctx.filter = buildCssFilterString(filters);

        // Draw image with filters applied
        ctx.drawImage(img, 0, 0);

        // Convert canvas to blob and then to File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob from canvas"));
              return;
            }

            // Create new File from blob, preserving original filename
            const newFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            resolve(newFile);
          },
          file.type,
          0.95 // Quality for JPEG (ignored for PNG)
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error("Failed to load image"));

    reader.readAsDataURL(file);
  });
}
