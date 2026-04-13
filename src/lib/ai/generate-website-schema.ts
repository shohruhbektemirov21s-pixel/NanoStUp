import "server-only";

import { runWebsiteSchemaGenerationPipeline } from "@/services/ai/website-schema-generation.service";

import type { GenerateWebsiteSchemaInput, GenerateWebsiteSchemaOutput } from "./website-generation.types";

export type { GenerateWebsiteSchemaInput, GenerateWebsiteSchemaOutput, WebsiteSchemaPromptSource } from "./website-generation.types";

/**
 * Foydalanuvchi nutqidan WebsiteSchema generatsiya qiladi.
 * Sanitizatsiya, JSON tiklash, Zod, qayta urinish, vaqtinchalik HTTP retry va zaxira shablon — `runWebsiteSchemaGenerationPipeline`.
 */
export async function generateWebsiteSchemaFromSpeech(
  input: GenerateWebsiteSchemaInput,
): Promise<GenerateWebsiteSchemaOutput> {
  return runWebsiteSchemaGenerationPipeline(input);
}
