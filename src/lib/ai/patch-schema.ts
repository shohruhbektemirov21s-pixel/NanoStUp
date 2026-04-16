import { generateJSON } from "./providers/google";
import { WebsiteSchema, websiteSchema } from "../schema/website";

export async function patchWebsiteSchema(
  currentSchema: WebsiteSchema, 
  editPrompt: string
): Promise<WebsiteSchema> {
  const systemInstruction = `
You are an AI website editor.
Your job is to apply PARTIAL updates to an existing WebsiteSchema based on user instructions.
DO NOT change parts that are not requested to be changed.
If the user says "change the colors", only update designDNA and theme.
If the user says "change hero", only update the hero section in the relevant page.
If the user says "add a contact page", add a new page object to the pages array.

Maintain consistency with the existing site name and business type.
Return the COMPLETE updated WebsiteSchema JSON.
`;

  const promptText = `
Current Schema:
${JSON.stringify(currentSchema, null, 2)}

User Instruction: "${editPrompt}"

Output the FULL updated schema in JSON.
`;

  try {
    const rawJSON = await generateJSON<any>(promptText, systemInstruction);
    const parsed = websiteSchema.parse(rawJSON);
    return parsed;
  } catch (error) {
    console.error("Patching failed:", error);
    return currentSchema; // return original if patching fails
  }
}
