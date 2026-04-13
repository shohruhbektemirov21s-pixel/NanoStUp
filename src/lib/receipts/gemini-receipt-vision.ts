import "server-only";

type GeminiVisionResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string };
};

function resolveGeminiForVision(): { apiKey: string; baseUrl: string; model: string } | null {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  const baseUrl = (process.env.GOOGLE_GENERATIVE_AI_BASE_URL?.trim() || "https://generativelanguage.googleapis.com").replace(
    /\/$/,
    "",
  );
  const model = process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || "gemini-2.0-flash";
  return { apiKey, baseUrl, model: model.replace(/^models\//, "") };
}

export type ReceiptVisionResult = {
  ocrSummary: string;
  contains_phone: boolean;
  contains_amount: boolean;
  contains_code: boolean;
};

function stripJsonFence(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "").trim();
  }
  return t;
}

export async function analyzeReceiptImageWithGemini(input: {
  imageBase64: string;
  mimeType: string;
  expectedPhoneDigits: string;
  expectedAmountUzs: number;
  paymentCode: string;
  signal?: AbortSignal;
}): Promise<ReceiptVisionResult | null> {
  const cfg = resolveGeminiForVision();
  if (!cfg) {
    return null;
  }

  const prompt = [
    "You are reading a payment receipt screenshot or photo.",
    "Return ONLY valid JSON with keys:",
    '{"ocr_summary":"short extracted key text from receipt","contains_phone":boolean,"contains_amount":boolean,"contains_code":boolean}',
    `The receipt should mention phone digits matching (any format): ${input.expectedPhoneDigits || "(not configured)"}.`,
    `The receipt should show payment amount matching ${input.expectedAmountUzs} UZS (allow formatting).`,
    `The payment comment / description MUST visibly include this exact payment reference string: "${input.paymentCode}".`,
    "If unsure, use false for booleans.",
  ].join("\n");

  const url = `${cfg.baseUrl}/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.05,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: input.signal,
  });

  const rawText = await response.text();
  let parsed: GeminiVisionResponse;
  try {
    parsed = JSON.parse(rawText) as GeminiVisionResponse;
  } catch {
    return null;
  }
  if (!response.ok) {
    console.warn("[receipt-vision] Gemini HTTP", response.status, parsed.error?.message);
    return null;
  }
  const parts = parsed.candidates?.[0]?.content?.parts;
  const text = parts?.map((p) => p.text ?? "").join("") ?? "";
  const cleaned = stripJsonFence(text);
  try {
    const j = JSON.parse(cleaned) as {
      ocr_summary?: string;
      contains_phone?: boolean;
      contains_amount?: boolean;
      contains_code?: boolean;
    };
    return {
      ocrSummary: typeof j.ocr_summary === "string" ? j.ocr_summary : "",
      contains_phone: Boolean(j.contains_phone),
      contains_amount: Boolean(j.contains_amount),
      contains_code: Boolean(j.contains_code),
    };
  } catch {
    return null;
  }
}
