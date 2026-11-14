import "server-only";

/**
 * Minimal Gemini `generateContent` REST client.
 * Deliberately sends only the fields every Gemini model accepts (no temperature / top-p / thinking
 * overrides: newer models ignore them or reject them), and never logs or returns the API key.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 25_000;

export interface FunctionCall {
  name: string;
  args?: Record<string, unknown>;
  id?: string;
}

export interface GeminiPart {
  text?: string;
  thought?: boolean;
  functionCall?: FunctionCall;
  functionResponse?: { name: string; id?: string; response: Record<string, unknown> };
  /** Opaque fields (e.g. thoughtSignature) must be passed back unchanged in tool loops. */
  [key: string]: unknown;
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiTool {
  functionDeclarations: {
    name: string;
    description: string;
    parameters: {
      type: "OBJECT";
      properties: Record<string, { type: "STRING"; description: string }>;
      required: string[];
    };
  }[];
}

export type GeminiErrorCode = "http" | "blocked" | "empty" | "network" | "timeout";

export class GeminiError extends Error {
  constructor(
    readonly code: GeminiErrorCode,
    message: string,
    readonly status = 0,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export interface GenerateParams {
  apiKey: string;
  model?: string;
  system: string;
  contents: GeminiContent[];
  tools?: GeminiTool[];
  maxOutputTokens?: number;
  fetchImpl?: typeof fetch;
}

export interface GenerateResult {
  /** The model turn exactly as returned; append it verbatim when continuing a tool loop. */
  content: GeminiContent;
  text: string;
  calls: FunctionCall[];
  finishReason?: string;
}

interface RawResponse {
  candidates?: { content?: GeminiContent; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

export async function generate(params: GenerateParams): Promise<GenerateResult> {
  const model = params.model ?? DEFAULT_GEMINI_MODEL;
  const doFetch = params.fetchImpl ?? fetch;
  const body = {
    systemInstruction: { parts: [{ text: params.system }] },
    contents: params.contents,
    ...(params.tools && params.tools.length > 0 ? { tools: params.tools } : {}),
    generationConfig: { maxOutputTokens: params.maxOutputTokens ?? 800 },
  };

  let response: Response;
  try {
    response = await doFetch(`${API_ROOT}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": params.apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new GeminiError(timedOut ? "timeout" : "network", timedOut ? "Gemini request timed out" : "Gemini request failed");
  }

  let json: RawResponse = {};
  try {
    json = (await response.json()) as RawResponse;
  } catch {
    /* non-JSON error body: handled below via status */
  }

  if (!response.ok) {
    // Only the provider's message is kept; the request (which carries the key header) never is.
    throw new GeminiError("http", `Gemini HTTP ${response.status}: ${(json.error?.message ?? "").slice(0, 200)}`, response.status);
  }
  if (json.promptFeedback?.blockReason) {
    throw new GeminiError("blocked", `Gemini blocked the prompt: ${json.promptFeedback.blockReason}`);
  }

  const candidate = json.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const calls = parts.flatMap((part) => (part.functionCall ? [part.functionCall] : []));
  const text = parts
    .filter((part) => typeof part.text === "string" && !part.thought)
    .map((part) => part.text as string)
    .join("")
    .trim();

  if (!candidate?.content || (text === "" && calls.length === 0)) {
    throw new GeminiError("empty", `Gemini returned no content (finishReason: ${candidate?.finishReason ?? "none"})`);
  }
  return { content: { role: "model", parts }, text, calls, finishReason: candidate.finishReason };
}
