import {
  ApiError,
  GoogleGenAI,
  ThinkingLevel,
  type Content,
  type FunctionDeclaration,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from "@google/genai";
import { env } from "../config/env.js";

// Chỉ phần SDK mà app dùng, để test thay bằng client giả (không gọi mạng).
export type GeminiClient = {
  models: { generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse> };
};

let client: GeminiClient | undefined;

// Tạo client khi cần lần đầu: AI tắt thì không bao giờ khởi tạo SDK.
export function getGeminiClient(): GeminiClient {
  if (!client) {
    if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

// Dùng trong test: thay client giả; truyền undefined để quay lại client thật.
export function setGeminiClient(next: GeminiClient | undefined) {
  client = next;
}

export type GenerateInput = {
  contents: Content[];
  systemInstruction: string;
  functionDeclarations?: FunctionDeclaration[];
  // Thứ tự model thử lần lượt; mặc định AGENT rồi LITE (mục 2 của tài liệu thiết kế).
  models?: string[];
};

export type GenerateResult =
  | { ok: true; response: GenerateContentResponse; model: string }
  | { ok: false; reason: "ERROR"; error: unknown };

export const defaultModelChain = () => [env.AI_MODEL_AGENT, env.AI_MODEL_LITE];

// Lỗi đáng thử model dự phòng: hết hạn mức (429), lỗi phía Google (5xx), hết thời gian chờ, lỗi mạng.
// Lỗi 4xx khác (key sai, request sai) thì model nào cũng lỗi như nhau nên không thử lại.
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 408 || error.status === 429 || error.status >= 500;
  if (error instanceof Error) {
    return error.name === "AbortError" || error.name === "TimeoutError" || error.name === "TypeError";
  }
  return false;
}

// Gọi Gemini với timeout và chuỗi model dự phòng. Không ném lỗi: trả kết quả có kiểu để service quyết định chuyển nhân viên.
export async function generate(input: GenerateInput, geminiClient: GeminiClient = getGeminiClient()): Promise<GenerateResult> {
  const models = input.models ?? defaultModelChain();
  let lastError: unknown = new Error("No model configured");
  for (const model of models) {
    try {
      const response = await geminiClient.models.generateContent({
        model,
        contents: input.contents,
        config: {
          systemInstruction: input.systemInstruction,
          ...(input.functionDeclarations?.length ? { tools: [{ functionDeclarations: input.functionDeclarations }] } : {}),
          // App tự chạy vòng gọi tool để kiểm soát phạm vi dữ liệu và số vòng.
          automaticFunctionCalling: { disable: true },
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: AbortSignal.timeout(env.AI_TIMEOUT_MS),
          // Tắt retry của SDK: chuỗi dự phòng ở đây đã là lần thử lại.
          httpOptions: { timeout: env.AI_TIMEOUT_MS, retryOptions: { attempts: 1 } },
        },
      });
      return { ok: true, response, model };
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error)) break;
    }
  }
  return { ok: false, reason: "ERROR", error: lastError };
}
