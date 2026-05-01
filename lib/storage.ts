import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const STORAGE_STRATEGY = process.env.STORAGE_STRATEGY || "local";

/**
 * Saves an uploaded photo based on the configured strategy.
 * Returns the URL/path to the saved photo.
 */
export async function savePhoto(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (STORAGE_STRATEGY === "base64") {
    const base64 = buffer.toString("base64");
    return `data:${file.type};base64,${base64}`;
  }

  // Default: Local filesystem (works well with Docker volumes)
  const uploadDir = join(process.cwd(), "public", "uploads");
  
  try {
    await mkdir(uploadDir, { recursive: true });
  } catch (err) {
    // Ignore if directory already exists
  }

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${randomUUID()}.${ext}`;
  const filePath = join(uploadDir, fileName);

  await writeFile(filePath, buffer);
  
  // Return the public URL path
  return `/uploads/${fileName}`;
}
