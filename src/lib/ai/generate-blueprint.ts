import { generateJSON } from "./providers/google";
import { Blueprint, blueprintSchema } from "../schema/blueprint";

export async function generateBlueprint(prompt: string): Promise<Blueprint> {
  const systemInstruction = `
You are an expert AI website architect.
Your job is to generate a comprehensive website Blueprint based on the user's prompt.
The prompt might be in Uzbek, Russian, or English.
RULES:
1. Identify the business type and intent.
2. If the user prompt is unsafe or 18+, return a generic premium fallback blueprint (e.g. general digital agency) without explicit error, just silently fallback to a safe business type.
3. Suggest an appropriate designDNA that fits the business.
4. Determine the language (uz, ru, en) from the prompt.
5. Create a list of pages with necessary sections.
DO NOT wrap the response in markdown, return ONLY pure JSON matching the schema.
`;

  const promptText = `
User Prompt: "${prompt}"

Output MUST strictly match this JSON structure:
{
  "siteName": "string",
  "businessType": "string",
  "targetAudience": "string",
  "brandTone": "string",
  "language": "uz|ru|en",
  "pages": [
    {
      "slug": "string",
      "title": "string",
      "description": "string",
      "requiredSections": ["hero", "features", ...]
    }
  ],
  "designDNA": {
    "visualStyle": "minimal-editorial|luxury-dark|startup-gradient|glassmorphism-soft|brutalist-grid|corporate-clean",
    "heroVariant": "split-hero|centered-hero|full-overlay-hero|cards-hero|product-hero",
    "navbarVariant": "floating|classic|centered-logo|sidebar",
    "typographyMood": "clean-sans|premium-serif|modern-tech|friendly-rounded",
    "spacingMode": "compact|balanced|airy",
    "cardStyle": "soft|sharp|glass|bordered|elevated",
    "colorMode": "neutral-light|dark-premium|gradient-vibrant|soft-pastel|monochrome-bold"
  },
  "featureSuggestions": ["string"]
}
`;

  try {
    const rawJSON = await generateJSON<any>(promptText, systemInstruction);
    const parsed = blueprintSchema.parse(rawJSON);
    return parsed;
  } catch (error) {
    console.error("Blueprint generation failed:", error);
    throw new Error("Failed to generate blueprint. Please try again.");
  }
}
