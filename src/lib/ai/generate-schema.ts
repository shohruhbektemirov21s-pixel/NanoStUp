import { generateJSON } from "./providers/google";
import { Blueprint } from "../schema/blueprint";
import { WebsiteSchema, websiteSchema } from "../schema/website";
import { getFallbackSchema } from "../fallback/fallback-manager";

export async function generateWebsiteSchema(blueprint: Blueprint, userPrompt: string): Promise<WebsiteSchema> {
  const systemInstruction = `
You are an advanced AI website generator.
Your job is to expand the provided 'Blueprint' into a full, detailed, structured 'WebsiteSchema' JSON.
Follow the designDNA and required sections from the Blueprint.
Provide realistic, professional, and grammatically correct copy in the selected language (${blueprint.language}).
DO NOT include any placeholders like 'Lorem Ipsum'. Write actual relevant content.
Ensure section IDs are unique.
DO NOT wrap the response in markdown, return pure JSON.
`;

  const promptText = `
User Prompt: "${userPrompt}"

Blueprint Context:
${JSON.stringify(blueprint, null, 2)}

Required Output Structure (Strict JSON matching the websiteSchema format):
{
  "siteName": "string",
  "businessType": "string",
  "language": "${blueprint.language}",
  "seo": { "title": "", "description": "", "keywords": "" },
  "designDNA": { /* copy exactly from blueprint */ },
  "pages": [
    {
      "slug": "string",
      "title": "string",
      "meta": { "title": "", "description": "" },
      "sections": [
        {
          "id": "unique-id",
          "type": "hero|features|services|products|menu|about|stats|testimonials|faq|gallery|pricing|booking|team|blog-list|contact|cta|footer|navbar",
          "variant": "string (optional)",
          "content": { /* flexible key-values for the section */ },
          "settings": { /* specific styles if needed */ }
        }
      ]
    }
  ]
}
`;

  try {
    const rawJSON = await generateJSON<any>(promptText, systemInstruction);
    const parsed = websiteSchema.parse(rawJSON);
    return parsed;
  } catch (error) {
    console.error("Schema generation failed, returning fallback:", error);
    // Auto fallback to safely resolve errors
    return getFallbackSchema(blueprint);
  }
}
