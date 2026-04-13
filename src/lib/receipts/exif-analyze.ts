import "server-only";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import exifr from "exifr";

export type ExifAnalyzeResult = {
  software: string | null;
  source: "pillow" | "exifr" | "none";
};

function runPillowScript(imagePath: string): Promise<ExifAnalyzeResult | null> {
  /** `RECEIPT_USE_PILLOW_EXIF=0` bo‘lsa Pillow o‘tkazib yuboriladi; aks holda skript bor bo‘lsa chaqiriladi. */
  if (process.env.RECEIPT_USE_PILLOW_EXIF?.trim() === "0") {
    return Promise.resolve(null);
  }
  const py = process.env.RECEIPT_EXIF_PYTHON_BIN?.trim() || "python3";
  const script = join(process.cwd(), "scripts", "receipt_exif_pillow.py");
  if (!existsSync(script)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const child = spawn(py, [script, imagePath], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout?.on("data", (c: Buffer) => {
      out += c.toString("utf8");
    });
    child.stderr?.on("data", (c: Buffer) => {
      err += c.toString("utf8");
    });
    child.on("error", () => resolve(null));
    child.on("close", (code) => {
      if (code !== 0) {
        if (err) {
          console.warn("[receipt-exif] pillow stderr:", err.slice(0, 200));
        }
        resolve(null);
        return;
      }
      try {
        const j = JSON.parse(out) as { ok?: boolean; software?: string | null };
        if (j.ok) {
          resolve({ software: typeof j.software === "string" ? j.software : null, source: "pillow" });
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    });
  });
}

async function runExifr(buffer: Buffer): Promise<string | null> {
  try {
    const tags = await exifr.parse(buffer, { translateKeys: true, translateValues: false, reviveValues: true });
    if (!tags || typeof tags !== "object") {
      return null;
    }
    const t = tags as Record<string, unknown>;
    const candidates = [t.Software, t.ProcessingSoftware, (t as { CreatorTool?: unknown }).CreatorTool]
      .filter((v) => typeof v === "string" && v.trim().length > 0)
      .map((v) => String(v).trim());
    return candidates[0] ?? null;
  } catch {
    return null;
  }
}

/** Photoshop va boshqa tahrirchilar — admin «SHUBHALI CHEK». */
export function isSuspiciousEditingSoftware(software: string | null): boolean {
  if (!software) {
    return false;
  }
  const s = software.toLowerCase();
  return (
    s.includes("photoshop") ||
    s.includes("adobe photoshop") ||
    s.includes("gimp") ||
    s.includes("paint.net") ||
    s.includes("pixelmator") ||
    s.includes("affinity photo") ||
    s.includes("photopea") ||
    s.includes("canva")
  );
}

export async function analyzeReceiptExif(imagePath: string, imageBuffer: Buffer): Promise<ExifAnalyzeResult> {
  const pillow = await runPillowScript(imagePath);
  if (pillow?.software) {
    return pillow;
  }
  const soft = await runExifr(imageBuffer);
  return { software: soft, source: soft ? "exifr" : "none" };
}
