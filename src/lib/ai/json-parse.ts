import { AiEngineError } from "./errors";

function extractFromFence(raw: string): string | null {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (!match?.[1]) {
    return null;
  }
  return match[1].trim();
}

/**
 * Qavs sanash oddiy JSON uchun yetarli; qator ichidagi `{` kamdan-kam uchraydi.
 */
function extractBalancedObject(raw: string): string {
  const start = raw.indexOf("{");
  if (start === -1) {
    throw new AiEngineError("JSON obyekt boshlanishi topilmadi", "INVALID_JSON");
  }

  let depth = 0;
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  throw new AiEngineError("Yopilmagan JSON obyekt", "INVALID_JSON");
}

/**
 * Model chiqimidan JSON ajratib, `unknown` qaytaradi (keyin Zod bilan tekshiriladi).
 */
export function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = extractFromFence(trimmed);
  if (fenced) {
    try {
      return JSON.parse(fenced) as unknown;
    } catch (error) {
      throw new AiEngineError("``` blok ichidagi JSON noto‘g‘ri", "INVALID_JSON", error);
    }
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    try {
      const sliced = extractBalancedObject(trimmed);
      return JSON.parse(sliced) as unknown;
    } catch (error) {
      if (error instanceof AiEngineError) {
        throw error;
      }
      throw new AiEngineError("JSON ajratish yoki parse xatosi", "INVALID_JSON", error);
    }
  }
}
