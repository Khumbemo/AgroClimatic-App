/*
  Gemini access through the public REST API (no SDK).

  Model: `gemini-flash-latest` is Google's alias for the current Flash model, so the app is not
  broken when a numbered model is retired (as gemini-1.5-flash was). Override with
  VITE_GEMINI_MODEL if needed.

  Security note: a key in VITE_GEMINI_API_KEY is shipped inside the app. Restrict it in Google
  Cloud (HTTP referrers / Android app) or route calls through a backend for production.
*/

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || 'gemini-flash-latest';

/** True when a Gemini key is configured; otherwise features fall back to offline behaviour. */
export const AI_ENABLED = Boolean(API_KEY) && API_KEY !== 'your_api_key';
export const AI_MODEL = MODEL;

export class AiUnavailableError extends Error {
  constructor() {
    super('AI features need a Gemini API key (VITE_GEMINI_API_KEY).');
    this.name = 'AiUnavailableError';
  }
}

type GenerateOptions = { system?: string; json?: boolean };

/** One-shot text generation. Throws AiUnavailableError without a key, Error on API failure. */
export async function generateText(prompt: string, { system, json }: GenerateOptions = {}): Promise<string> {
  if (!AI_ENABLED) throw new AiUnavailableError();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY! },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      ...(json ? { generationConfig: { responseMimeType: 'application/json' } } : {}),
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message || `Gemini request failed (HTTP ${res.status})`);
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('');
  if (!text) throw new Error('The model returned no text.');
  return text;
}

export type DesignSuggestion = {
  name?: string;
  designType?: 'CRD' | 'RCBD' | 'Latin_Square' | 'Split_Plot';
  replicates?: number;
  treatments?: string[];
  subTreatments?: string[];
};

export const aiService = {
  async generateExperimentalDesign(request: string): Promise<DesignSuggestion> {
    const text = await generateText(
      `Suggest a nursery experiment for this request: "${request}".
Return JSON: {"name": string, "designType": "CRD" | "RCBD" | "Latin_Square" | "Split_Plot", "replicates": number, "treatments": string[], "subTreatments": string[]}.
Use subTreatments only for Split_Plot (sub-plot factor levels). For Latin_Square, replicates equals the number of treatments.`,
      { system: 'You are an experimental-design specialist for forest nursery trials. Be conservative and practical.', json: true },
    );
    return JSON.parse(text) as DesignSuggestion;
  },

  async analyzeDataInsights(dataSummary: string): Promise<string> {
    return generateText(
      `Interpret this nursery data in one short paragraph. State what the numbers show, one practical next step, and any caveat about sample size: ${dataSummary}`,
      { system: 'You are a seed and nursery scientist. Do not invent data that is not in the summary.' },
    );
  },
};
