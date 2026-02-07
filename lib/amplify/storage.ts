import { getUrl, remove } from "aws-amplify/storage";

export interface UploadResult {
  path: string;
  url: string;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

/**
 * Get a pre-signed URL for uploading a file
 * This bypasses Amplify auth and uses server-side AWS credentials
 */
async function getPresignedUploadUrl(
  fileName: string,
  contentType: string
): Promise<PresignedUploadResult> {
  try {
    const response = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, contentType }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Upload URL API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || "Failed to get upload URL");
      } catch {
        throw new Error(`Failed to get upload URL: ${response.statusText}`);
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting presigned URL:", error);
    throw error;
  }
}

/**
 * Upload a file using a pre-signed URL
 * @param file - The file to upload
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns The path and public URL of the uploaded file
 */
export async function uploadFileWithPresignedUrl(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // Get pre-signed URL from our API
  const { uploadUrl, key, publicUrl } = await getPresignedUploadUrl(
    file.name,
    file.type
  );

  // Upload directly to S3 using the pre-signed URL
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress((event.loaded / event.total) * 100);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed"));
    });

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });

  return {
    path: key,
    url: publicUrl,
  };
}

/**
 * Delete a file from Amplify Storage
 * @param path - The full path of the file to delete (including media/ prefix)
 */
export async function deleteFile(path: string): Promise<void> {
  await remove({ path });
}

/**
 * Get the public URL for a file in Amplify Storage
 * @param path - The full path of the file (including media/ prefix)
 * @returns The public URL
 */
export async function getFileUrl(path: string): Promise<string> {
  const result = await getUrl({ path });
  return result.url.toString();
}

/**
 * Check if a URL is from Amplify Storage (S3)
 * @param url - The URL to check
 * @returns True if the URL is from Amplify/S3 storage
 */
export function isAmplifyStorageUrl(url: string): boolean {
  return (
    url.includes("amplifyapp") ||
    url.includes("s3.") ||
    url.includes("amazonaws.com")
  );
}

/**
 * Extract the storage path from an Amplify Storage URL
 * @param url - The Amplify Storage URL
 * @returns The path portion, or null if not an Amplify URL
 */
export function extractPathFromUrl(url: string): string | null {
  if (!isAmplifyStorageUrl(url)) {
    return null;
  }

  // Try to extract path after /media/
  const mediaMatch = url.match(/\/media\/(.+?)(\?|$)/);
  if (mediaMatch) {
    return `media/${mediaMatch[1]}`;
  }

  return null;
}
