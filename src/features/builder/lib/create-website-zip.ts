"use client";

import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";
import { buildWebsiteZipUint8Array, type WebsiteExportZipFormat } from "@/shared/lib/build-website-zip";
import { slugifySiteFileName } from "@/shared/lib/slugify";

export { slugifySiteFileName } from "@/shared/lib/slugify";

export async function createWebsiteZipBlob(
  schema: WebsiteSchema,
  options?: { format?: WebsiteExportZipFormat },
): Promise<Blob> {
  const bytes = await buildWebsiteZipUint8Array(schema, options);
  return new Blob([bytes as BlobPart], { type: "application/zip" });
}

export async function downloadWebsiteZip(schema: WebsiteSchema): Promise<void> {
  const blob = await createWebsiteZipBlob(schema);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugifySiteFileName(schema.siteName)}.zip`;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadWebsiteNextZip(schema: WebsiteSchema): Promise<void> {
  const blob = await createWebsiteZipBlob(schema, { format: "next" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugifySiteFileName(schema.siteName)}-next.zip`;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}
