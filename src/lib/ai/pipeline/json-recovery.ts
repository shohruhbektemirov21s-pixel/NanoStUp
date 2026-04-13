import { jsonrepair } from "jsonrepair";

import { AiEngineError } from "../errors";
import { parseModelJson } from "../json-parse";

function stripBom(raw: string): string {
  if (raw.charCodeAt(0) === 0xfeff) {
    return raw.slice(1);
  }
  return raw;
}

/**
 * Model ba'zan oxirgi vergul qo‘yadi — faqat `,}` yoki `,]` dan oldin.
 */
export function removeTrailingCommasInJsonText(json: string): string {
  return json.replace(/,(\s*[}\]])/g, "$1");
}

export type ParseModelJsonRecoveryResult =
  | { ok: true; value: unknown; recoveries: string[] }
  | { ok: false; error: AiEngineError; recoveries: string[] };

/**
 * `parseModelJson` dan keyin ham ishlaydigan yengil tiklash: BOM, trailing comma.
 */
export function parseModelJsonWithRecovery(raw: string): ParseModelJsonRecoveryResult {
  const trimmed = raw.trim();
  const text = stripBom(trimmed);
  const recoveries: string[] = [];
  if (text !== trimmed) {
    recoveries.push("strip_bom");
  }

  const tryOnce = (s: string): unknown => parseModelJson(s);

  try {
    const value = tryOnce(text);
    return { ok: true, value, recoveries };
  } catch (e1) {
    const lastFromFirst =
      e1 instanceof AiEngineError
        ? e1
        : new AiEngineError(e1 instanceof Error ? e1.message : "JSON parse xatosi", "INVALID_JSON", e1);

    const decomma = removeTrailingCommasInJsonText(text);
    if (decomma === text) {
      let repairedNoComma: string;
      try {
        repairedNoComma = jsonrepair(text);
      } catch {
        return { ok: false, error: lastFromFirst, recoveries };
      }
      try {
        const value = tryOnce(repairedNoComma);
        return { ok: true, value, recoveries: [...recoveries, "jsonrepair"] };
      } catch {
        return { ok: false, error: lastFromFirst, recoveries: [...recoveries, "jsonrepair_failed"] };
      }
    }

    try {
      const value = tryOnce(decomma);
      return { ok: true, value, recoveries: [...recoveries, "remove_trailing_commas"] };
    } catch (e2) {
      const err =
        e2 instanceof AiEngineError
          ? e2
          : new AiEngineError(e2 instanceof Error ? e2.message : "JSON parse xatosi", "INVALID_JSON", e2);
      let repaired: string;
      try {
        repaired = jsonrepair(decomma);
      } catch {
        return { ok: false, error: err, recoveries: [...recoveries, "remove_trailing_commas"] };
      }
      try {
        const value = tryOnce(repaired);
        return {
          ok: true,
          value,
          recoveries: [...recoveries, "remove_trailing_commas", "jsonrepair"],
        };
      } catch (e3) {
        const err3 =
          e3 instanceof AiEngineError
            ? e3
            : new AiEngineError(e3 instanceof Error ? e3.message : "JSON parse xatosi", "INVALID_JSON", e3);
        return { ok: false, error: err3, recoveries: [...recoveries, "remove_trailing_commas", "jsonrepair_failed"] };
      }
    }
  }
}
