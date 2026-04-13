import "server-only";

import { mkdir } from "node:fs/promises";
import { join, posix } from "node:path";

export async function ensureReceiptUploadDir(): Promise<string> {
  const dir = join(process.cwd(), "data", "receipt-uploads");
  await mkdir(dir, { recursive: true });
  return dir;
}

export function receiptStorageRelativePath(fileName: string): string {
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    throw new Error("invalid file name");
  }
  return posix.join("data", "receipt-uploads", fileName);
}

export function receiptAbsolutePathFromDb(storagePath: string): string {
  const norm = storagePath.replace(/\\/g, "/");
  if (!norm.startsWith("data/receipt-uploads/")) {
    throw new Error("invalid storage path");
  }
  return join(process.cwd(), ...norm.split("/").filter(Boolean));
}
