import fs from "fs";
import path from "path";

export function validateVideoFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const validExts = [".mp4", ".mov", ".avi", ".mkv", ".m4v", ".webm"];

  if (!validExts.includes(ext)) {
    throw new Error(`Unsupported file format: ${ext}`);
  }
}
