import { WEBSITE_PROMPT_MAX_CHARS } from "@/lib/website-generate-body.zod";

export type SanitizeWebsitePromptResult = {
  text: string;
  removedControlChars: number;
  truncated: boolean;
};

/**
 * Server-side prompt: boshqaruv belgilari, NUL, ortiqcha uzunlik — generatsiya va log xavfsizligi.
 */
export function sanitizeWebsiteUserPrompt(
  prompt: string,
  maxChars: number = WEBSITE_PROMPT_MAX_CHARS,
): SanitizeWebsitePromptResult {
  let removedControlChars = 0;
  let out = "";
  for (const ch of prompt) {
    const c = ch.codePointAt(0)!;
    if (c === 0) {
      removedControlChars += 1;
      continue;
    }
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) {
      removedControlChars += 1;
      continue;
    }
    out += ch;
  }

  const trimmed = out.trim();
  const truncated = trimmed.length > maxChars;
  const text = truncated ? trimmed.slice(0, maxChars) : trimmed;

  return { text, removedControlChars, truncated };
}
