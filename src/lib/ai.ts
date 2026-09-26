import "server-only";
import type { AiKey } from "@/lib/secret-settings";

const OPENAI_MODEL = "gpt-5-nano";
// Newest free Flash first; the older one in case the newer id is not available for this key
const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-2.5-flash"];

export class ProviderError extends Error {}

// Every answer field is a nullable string; `enum` limits it to given values (e.g. category names)
export type AnswerFields = Record<string, { enum?: string[] }>;

async function askOpenAi(key: string, prompt: string, fields: AnswerFields, imageBase64: string | undefined, timeoutMs: number): Promise<string> {
  const properties = Object.fromEntries(
    Object.entries(fields).map(([name, f]) => [
      name,
      f.enum ? { type: ["string", "null"], enum: [...f.enum, null] } : { type: ["string", "null"] },
    ])
  );
  const content: object[] = [{ type: "input_text", text: prompt }];
  if (imageBase64) content.push({ type: "input_image", image_url: `data:image/jpeg;base64,${imageBase64}`, detail: "auto" });
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: OPENAI_MODEL,
      // Do not keep the household's data in the OpenAI account logs
      store: false,
      reasoning: { effort: "minimal" },
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "answer",
          strict: true,
          schema: { type: "object", additionalProperties: false, properties, required: Object.keys(fields) },
        },
      },
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) throw new ProviderError(`OpenAI ${res.status} ${json?.error?.message ?? ""}`);
  // Responses API: the answer is the output_text part of the message item
  return (json.output ?? [])
    .flatMap((item: { type?: string; content?: { type?: string; text?: string }[] }) =>
      item.type === "message" ? (item.content ?? []) : []
    )
    .find((c: { type?: string }) => c.type === "output_text")?.text;
}

async function askGemini(key: string, prompt: string, fields: AnswerFields, imageBase64: string | undefined, timeoutMs: number): Promise<string> {
  const parts: object[] = [];
  if (imageBase64) parts.push({ inline_data: { mime_type: "image/jpeg", data: imageBase64 } });
  parts.push({ text: prompt });
  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: Object.fromEntries(
          Object.entries(fields).map(([name, f]) => [name, { type: "STRING", nullable: true, ...(f.enum && { enum: f.enum }) }])
        ),
        required: Object.keys(fields),
      },
    },
  });
  let last = "";
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body,
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json) return json.candidates?.[0]?.content?.parts?.[0]?.text;
    last = `Gemini ${model} ${res.status} ${json?.error?.message ?? ""}`;
    // Unknown model for this key: try the next one; anything else is a real failure
    if (res.status !== 404) break;
  }
  throw new ProviderError(last);
}

// Asks the configured model and returns the parsed JSON answer. Throws ProviderError on provider trouble.
export async function askAi(
  ai: AiKey,
  prompt: string,
  fields: AnswerFields,
  imageBase64?: string,
  timeoutMs = 30000
): Promise<Record<string, string | null>> {
  const text =
    ai.provider === "openai"
      ? await askOpenAi(ai.key, prompt, fields, imageBase64, timeoutMs)
      : await askGemini(ai.key, prompt, fields, imageBase64, timeoutMs);
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError("answer is not JSON");
  }
}
