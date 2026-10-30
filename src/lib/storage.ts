import { existsSync } from "fs";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { put, del } from "@vercel/blob";

export interface StorageResult {
  url: string;
  pathname: string;
}

// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
  ".pdf", ".txt", ".csv", ".json",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Sanitize a filename — remove path traversal and dangerous characters.
 */
export function sanitizeFilename(filename: string): string {
  const basename = filename.split(/[/\\]/).pop() || filename;
  const sanitized = basename
    .replace(/[<>:"|?*\x00-\x1f]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+/, "")
    .trim();

  if (!sanitized) throw new Error("Invalid filename");
  if (sanitized.length > 255) {
    const ext = sanitized.slice(sanitized.lastIndexOf("."));
    return sanitized.slice(0, 255 - ext.length) + ext;
  }
  return sanitized;
}

/**
 * Validate a file before upload.
 */
export function validateFile(
  buffer: Buffer,
  filename: string
): { valid: true } | { valid: false; error: string } {
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: "File too large. Maximum size is 5MB." };
  }
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}`,
    };
  }
  return { valid: true };
}

/**
 * Upload a file. Automatically uses local storage or Vercel Blob
 * based on whether BLOB_READ_WRITE_TOKEN is set.
 *
 * @example
 * const result = await upload(buffer, "avatar.png", "avatars");
 * console.log(result.url); // /uploads/avatars/avatar.png
 */
export async function upload(
  buffer: Buffer,
  filename: string,
  folder?: string
): Promise<StorageResult> {
  const safe = sanitizeFilename(filename);
  const check = validateFile(buffer, safe);
  if (!check.valid) throw new Error(check.error);

  const pathname = folder ? `${folder}/${safe}` : safe;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(pathname, buffer, { access: "public" });
    return { url: blob.url, pathname: blob.pathname };
  }

  // Local filesystem
  const uploadsDir = join(process.cwd(), "public", "uploads");
  const targetDir = folder ? join(uploadsDir, folder) : uploadsDir;
  if (!existsSync(targetDir)) await mkdir(targetDir, { recursive: true });
  await writeFile(join(targetDir, safe), buffer);
  return { url: `/uploads/${pathname}`, pathname };
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(url: string): Promise<void> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await del(url);
    return;
  }
  const pathname = url.replace(/^\/uploads\//, "");
  const uploadsRoot = join(process.cwd(), "public", "uploads");
  const filepath = join(uploadsRoot, pathname);
  // Guard against path traversal — resolved path must stay inside uploads/
  if (!filepath.startsWith(uploadsRoot + "/") && filepath !== uploadsRoot) {
    throw new Error("Invalid file path");
  }
  if (existsSync(filepath)) await unlink(filepath);
}
