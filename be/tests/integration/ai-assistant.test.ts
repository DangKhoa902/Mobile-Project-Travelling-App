import { ApiError, GenerateContentResponse } from "@google/genai";
import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { setGeminiClient } from "../../src/lib/gemini.js";
import { createAssistantLimiter } from "../../src/routes/ai.routes.js";

// Không chạm DB và không gọi mạng: Gemini giả, câu trả lời không gọi tool địa điểm.
describe("POST /api/ai/assistant", () => {
  afterEach(() => {
    env.AI_ENABLED = false;
    setGeminiClient(undefined);
    vi.restoreAllMocks();
  });

  const post = (body: object) => request(app).post("/api/ai/assistant").send(body);

  it.each([
    ["thiếu messages", {}],
    ["tin cuối là model", { messages: [{ role: "user", text: "a" }, { role: "model", text: "b" }] }],
    ["không xen kẽ", { messages: [{ role: "user", text: "a" }, { role: "user", text: "b" }] }],
    ["text rỗng", { messages: [{ role: "user", text: "  " }] }],
    ["text quá dài", { messages: [{ role: "user", text: "x".repeat(2001) }] }],
  ])("400 VALIDATION_ERROR: %s", async (_name, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("503 AI_DISABLED khi AI_ENABLED=false", async () => {
    const response = await post({ messages: [{ role: "user", text: "Xin chào" }] });
    expect(response.status).toBe(503);
    expect(response.body.code).toBe("AI_DISABLED");
  });

  it("AI bật: trả reply và destinations", async () => {
    env.AI_ENABLED = true;
    vi.spyOn(console, "log").mockImplementation(() => {});
    const fake = new GenerateContentResponse();
    fake.candidates = [{ content: { role: "model", parts: [{ text: "Chào bạn, bạn muốn đi đâu?" }] }, finishReason: "STOP" as never }];
    const generateContent = vi.fn(async () => fake);
    setGeminiClient({ models: { generateContent } });

    const response = await post({ messages: [{ role: "user", text: "Xin chào" }] });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { reply: "Chào bạn, bạn muốn đi đâu?", destinations: [] } });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("Gemini lỗi cả model chính và dự phòng → 503 AI_UNAVAILABLE", async () => {
    env.AI_ENABLED = true;
    vi.spyOn(console, "log").mockImplementation(() => {});
    const generateContent = vi.fn(async (): Promise<GenerateContentResponse> => {
      throw new ApiError({ message: "down", status: 503 });
    });
    setGeminiClient({ models: { generateContent } });

    const response = await post({ messages: [{ role: "user", text: "Xin chào" }] });
    expect(response.status).toBe(503);
    expect(response.body.code).toBe("AI_UNAVAILABLE");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});

describe("giới hạn trợ lý công khai", () => {
  it("vượt giới hạn trả 429 TOO_MANY_REQUESTS", async () => {
    const limited = express().post("/", createAssistantLimiter({ limit: 1, skip: () => false }), (_request, response) => {
      response.json({ ok: true });
    });
    expect((await request(limited).post("/")).status).toBe(200);
    const second = await request(limited).post("/");
    expect(second.status).toBe(429);
    expect(second.body.code).toBe("TOO_MANY_REQUESTS");
  });
});
