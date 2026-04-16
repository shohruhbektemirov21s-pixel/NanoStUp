import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiModel(modelName: string = "gemini-2.5-flash") {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set in environment.");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI.getGenerativeModel({ model: modelName });
}

export async function generateJSON<T>(
  prompt: string, 
  systemInstruction?: string,
  modelName: string = "gemini-2.5-flash"
): Promise<T> {
  const model = getGeminiModel(modelName);
  
  try {
    const options: any = {
      generationConfig: {
        responseMimeType: "application/json",
      }
    };
    if (systemInstruction) {
      options.systemInstruction = systemInstruction;
    }
    
    // Sometimes the types of generative-ai drift, so we pass it safely
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: systemInstruction ? { role: "system", parts: [{ text: systemInstruction }] } : undefined,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Gemini Provider Error:", error);
    throw error;
  }
}
