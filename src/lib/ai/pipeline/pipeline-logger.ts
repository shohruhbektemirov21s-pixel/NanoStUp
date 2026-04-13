import "server-only";

export type WebsiteAiPipelineLogLevel = "info" | "warn" | "error";

export type WebsiteAiPipelineLogEntry = {
  service: "website-ai-pipeline";
  level: WebsiteAiPipelineLogLevel;
  event: string;
  stage?: "sanitize" | "llm" | "json_parse" | "preprocess" | "zod" | "fallback";
  attempt?: number;
  maxAttempts?: number;
  provider?: string;
  /** Hech qachon API kalit yoki to‘liq prompt */
  promptLength?: number;
  recoveries?: string[];
  usedFallback?: boolean;
  zodIssueCount?: number;
  httpStatus?: number;
  message?: string;
};

function emit(entry: WebsiteAiPipelineLogEntry): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export function logWebsiteAiPipelineInfo(partial: Omit<WebsiteAiPipelineLogEntry, "service" | "level">): void {
  emit({ service: "website-ai-pipeline", level: "info", ...partial });
}

export function logWebsiteAiPipelineWarn(partial: Omit<WebsiteAiPipelineLogEntry, "service" | "level">): void {
  emit({ service: "website-ai-pipeline", level: "warn", ...partial });
}

export function logWebsiteAiPipelineError(partial: Omit<WebsiteAiPipelineLogEntry, "service" | "level">): void {
  emit({ service: "website-ai-pipeline", level: "error", ...partial });
}
