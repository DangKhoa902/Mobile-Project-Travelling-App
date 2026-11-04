import { GenerateContentResponse } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { env } from "../../src/config/env.js";
import type { GenerateInput, GenerateResult } from "../../src/lib/gemini.js";
import { runText, suggestSystemPrompt, summarySystemPrompt, transcriptFor } from "../../src/services/ai-staff.service.js";

function resp(text: string, finishReason = "STOP") {
  const r = new GenerateContentResponse();
  r.candidates = [{ content: { role: "model", parts: [{ text }] }, finishReason: finishReason as never }];
  return r;
}
const ok = (r: GenerateContentResponse): GenerateResult => ({ ok: true, response: r, model: env.AI_MODEL_LITE });

describe("transcriptFor", () => {
  it("gắn nhãn Khách / Trợ lý AI / Nhân viên và cắt 1000 ký tự", () => {
    const text = transcriptFor(
      [
        { senderType: "USER", senderId: 7, content: "a".repeat(1500) },
        { senderType: "AI", senderId: null, content: "Chào bạn" },
        { senderType: "USER", senderId: 9, content: "Em kiểm tra" },
      ],
      7,
    );
    const lines = text.split("\n");
    expect(lines[0].startsWith("Khách: ")).toBe(true);
    expect(lines[0].length).toBe("Khách: ".length + 1000);
    expect(lines[1]).toBe("Trợ lý AI: Chào bạn");
    expect(lines[2]).toBe("Nhân viên: Em kiểm tra");
  });

  it("chỉ lấy 30 tin cuối", () => {
    const messages = Array.from({ length: 40 }, (_, i) => ({ senderType: "USER" as const, senderId: 1, content: `m${i}` }));
    const lines = transcriptFor(messages, 1).split("\n");
    expect(lines).toHaveLength(30);
    expect(lines[0]).toBe("Khách: m10");
  });
});

describe("prompt", () => {
  it("gợi ý chứa chính sách và mã booking", () => {
    const prompt = suggestSystemPrompt("Hủy phòng", "TA1");
    expect(prompt).toContain("Hoàn tiền");
    expect(prompt).toContain("48 giờ");
    expect(prompt).toContain("TA1");
  });
  it("tóm tắt yêu cầu tối đa 5 dòng", () => {
    expect(summarySystemPrompt("x")).toContain("tối đa 5 dòng");
  });
});

describe("runText", () => {
  it("dùng model LITE, không tool, trả text đã trim", async () => {
    const fn = vi.fn(async (_: GenerateInput) => ok(resp("  Chào bạn  ")));
    expect(await runText("sys", "hi", fn)).toBe("Chào bạn");
    expect(fn.mock.calls[0][0].models).toEqual([env.AI_MODEL_LITE]);
    expect(fn.mock.calls[0][0].functionDeclarations).toBeUndefined();
  });

  it.each([
    ["lỗi Gemini", async (): Promise<GenerateResult> => ({ ok: false, reason: "ERROR", error: new Error("x") })],
    ["bị chặn", async () => ok(resp("", "SAFETY"))],
    ["rỗng", async () => ok(resp("  "))],
  ])("%s → 503 AI_UNAVAILABLE", async (_name, fn) => {
    await expect(runText("sys", "hi", fn)).rejects.toMatchObject({ status: 503, code: "AI_UNAVAILABLE" });
  });
});
