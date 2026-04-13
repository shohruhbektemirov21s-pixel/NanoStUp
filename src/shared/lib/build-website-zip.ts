import JSZip from "jszip";

import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";

import { populateNextExportZip } from "./export-next-app/populate-next-export-zip";
import { populateWebsiteStarterExportZip } from "./export-starter/populate-website-starter-zip";

export type WebsiteExportZipFormat = "static" | "next";

/**
 * Server va brauzerda ZIP yaratish (Uint8Array — `Blob` yoki `Buffer` uchun qulay).
 * - `static` — `index.html`, `styles.css`, hash-router, `serve` bilan preview.
 * - `next` — Next.js 14 App Router + `output: 'export'` (build → `out/`).
 */
export async function buildWebsiteZipUint8Array(
  schema: WebsiteSchema,
  options?: { format?: WebsiteExportZipFormat },
): Promise<Uint8Array> {
  const zip = new JSZip();
  if (options?.format === "next") {
    populateNextExportZip(zip, schema);
  } else {
    populateWebsiteStarterExportZip(zip, schema);
  }
  const out = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return out;
}
