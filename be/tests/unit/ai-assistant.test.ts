import { GenerateContentResponse, type Content } from "@google/genai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../../src/config/env.js";
import type { GenerateInput, GenerateResult } from "../../src/lib/gemini.js";
import { HttpError } from "../../src/lib/http-error.js";
import {
  askAssistant,
  assistantSchema,
  buildAssistantPrompt,
  pickMentioned,
  type DestinationSummary,
} from "../../src/services/ai-assistant.service.js";
import { createPublicToolExecutor, publicToolDeclarations, type ToolDeps } from "../../src/services/ai-tools.js";

// Gemini và DB luôn được giả lập: không test nào gọi mạng.

function fakeResponse(parts: Record<string, unknown>[], finishReason = "STOP") {
  const response = new GenerateContentResponse();
  response.candidates = [{ content: { role: "model", parts }, finishReason: finishReason as never }];
  return response;
}
const textResponse = (text: string) => fakeResponse([{ text }]);
const callResponse = (name: string, args: Record<string, unknown>) =>
  fakeResponse([{ functionCall: { id: `call-${name}`, name, args }, thoughtSignature: "sig" }]);
const ok = (response: GenerateContentResponse, model = env.AI_MODEL_AGENT): GenerateResult => ({ ok: true, response, model });

const summary = (id: number, name: string) => ({
  id,
  name,
  slug: `dd-${id}`,
  location: "Đà Lạt",
  imageUrl: null,
  minPrice: 1_000_000,
  averageRating: 4.5,
  reviewCount: 10,
  isFeatured: false,
  isActive: true,
  listingStatus: "APPROVED",
  ownerId: 3,
  category: { id: 1, name: "Resort", slug: "resort" },
});

function deps(overrides: Partial<ToolDeps> = {}): ToolDeps {
  return {
    findDestinations: vi.fn(async () => [[summary(1, "Đồi Thông Resort"), summary(2, "Hồ Xanh Homestay"), summary(3, "Sương Mù Villa")], 3]) as never,
    findDestination: vi.fn(async () => ({
      ...summary(2, "Hồ Xanh Homestay"),
      description: "",
      policy: null,
      facilities: [],
      packages: [],
      roomTypes: [],
      services: [],
    })) as never,
    quoteBooking: vi.fn() as never,
    listBookings: vi.fn() as never,
    getBooking: vi.fn() as never,
    findBookingIdByCode: vi.fn(),
    ...overrides,
  };
}

const user = (text: string) => ({ role: "user" as const, text });
const model = (text: string) => ({ role: "model" as const, text });

describe("assistantSchema", () => {
  it("nhận hội thoại xen kẽ bắt đầu và kết thúc bằng user, cắt khoảng trắng", () => {
    const parsed = assistantSchema.parse({ messages: [user("  Đi đâu cuối tuần?  "), model("Bạn thích biển hay núi?"), user("Núi")] });
    expect(parsed.messages[0].text).toBe("Đi đâu cuối tuần?");
  });

  it.each([
    ["rỗng", []],
    ["tin cuối là model", [user("a"), model("b")]],
    ["không xen kẽ", [user("a"), user("b")]],
    ["bắt đầu bằng model", [model("a"), user("b")]],
    ["text chỉ có khoảng trắng", [user("   ")]],
    ["text quá 2000 ký tự", [user("x".repeat(2001))]],
    ["role lạ", [{ role: "system", text: "a" }]],
    ["quá 20 tin", Array.from({ length: 21 }, (_, index) => (index % 2 === 0 ? user("a") : model("b")))],
  ])("từ chối: %s", (_name, messages) => {
    expect(assistantSchema.safeParse({ messages }).success).toBe(false);
  });
});

describe("buildAssistantPrompt", () => {
  it("có ngày hôm nay theo giờ Việt Nam và không nhắc tool chuyển nhân viên", () => {
    const prompt = buildAssistantPrompt(new Date("2026-11-04T18:30:00Z"));
    expect(prompt).toContain("2026-11-05");
    expect(prompt).toContain("quote_booking");
    expect(prompt).not.toContain("handoff_to_staff");
  });
});

describe("tool tư vấn công khai", () => {
  it("chỉ có 4 tool tư vấn", () => {
    expect(publicToolDeclarations.map((tool) => tool.name)).toEqual(["search_destinations", "get_destination", "quote_booking", "get_policies"]);
  });

  it("không chạy tool booking / chuyển nhân viên; gom địa điểm không trùng", async () => {
    const tools = createPublicToolExecutor(deps());
    expect(await tools.executeTool("list_my_bookings", {})).toMatchObject({ error: { code: "UNKNOWN_TOOL" } });
    expect(await tools.executeTool("handoff_to_staff", { reason: "x", summary: "y" })).toMatchObject({ error: { code: "UNKNOWN_TOOL" } });
    expect(await tools.executeTool("toString", {})).toMatchObject({ error: { code: "UNKNOWN_TOOL" } });
    await tools.executeTool("search_destinations", { q: "Đà Lạt" });
    await tools.executeTool("get_destination", { slug: "dd-2" });
    expect(tools.collectedDestinations().map((destination) => destination.id)).toEqual([1, 2, 3]);
  });
});

describe("pickMentioned", () => {
  const names = ["Một", "Hai", "Ba", "Bốn"];
  const collected = names.map((name, index) => ({ id: index + 1, slug: `dd-${index + 1}`, name: `Địa điểm ${name}` }));

  it("ưu tiên địa điểm có nhắc tên (không phân biệt hoa thường)", () => {
    expect(pickMentioned("Bạn thử ĐỊA ĐIỂM HAI nhé", collected).map((d) => d.id)).toEqual([2]);
  });

  it("không nhắc tên nào thì lấy tất cả, tối đa 3", () => {
    expect(pickMentioned("Có vài lựa chọn", collected).map((d) => d.id)).toEqual([1, 2, 3]);
  });
});

describe("askAssistant", () => {
  const input = { messages: [user("Gợi ý chỗ nghỉ ở Đà Lạt")] };
  const findSummaries = vi.fn(async (ids: number[]) => ids.map((id) => summary(id, `#${id}`)) as DestinationSummary[]);

  beforeEach(() => {
    env.AI_ENABLED = true;
    findSummaries.mockClear();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    env.AI_ENABLED = false;
    vi.restoreAllMocks();
  });

  it("AI tắt → AI_DISABLED", async () => {
    env.AI_ENABLED = false;
    await expect(askAssistant(input, { generateFn: vi.fn() })).rejects.toMatchObject({ status: 503, code: "AI_DISABLED" });
  });

  it("chạy vòng tool với 4 tool tư vấn, trả thẻ của địa điểm được nhắc tên", async () => {
    const generateFn = vi
      .fn<(input: GenerateInput) => Promise<GenerateResult>>()
      .mockResolvedValueOnce(ok(callResponse("search_destinations", { q: "Đà Lạt" })))
      .mockResolvedValueOnce(ok(textResponse("Mình gợi ý Hồ Xanh Homestay và Sương Mù Villa. Bạn bấm vào thẻ để xem chi tiết nhé.")));
    const result = await askAssistant(input, { generateFn, toolDeps: deps(), findSummaries });

    expect(result.reply).toContain("Hồ Xanh Homestay");
    expect(findSummaries).toHaveBeenCalledWith([2, 3]);
    expect(result.destinations.map((d) => d.id)).toEqual([2, 3]);
    const firstCall = generateFn.mock.calls[0][0];
    expect(firstCall.functionDeclarations?.map((tool) => tool.name)).not.toContain("handoff_to_staff");
    expect(firstCall.contents[0]).toEqual({ role: "user", parts: [{ text: "Gợi ý chỗ nghỉ ở Đà Lạt" }] } satisfies Content);
    // Vòng đầu bắt buộc gọi tool (tránh bịa tên địa điểm), vòng sau để model tự quyết.
    expect(firstCall.toolMode).toBe("ANY");
    expect(generateFn.mock.calls[1][0].toolMode).toBeUndefined();
    // thoughtSignature của model được gửi lại ở vòng sau.
    expect(generateFn.mock.calls[1][0].contents[1].parts?.[0].thoughtSignature).toBe("sig");

    // Log một dòng JSON: model + số tool, không có nội dung tin.
    const logMock = console.log as unknown as { mock: { calls: unknown[][] } };
    const line = String(logMock.mock.calls.at(-1)?.[0]);
    expect(JSON.parse(line)).toMatchObject({ job: "aiAssistant", outcome: "reply", model: env.AI_MODEL_AGENT, toolCalls: 1 });
    expect(line).not.toContain("Đà Lạt");
  });

  it("không gọi tool địa điểm thì destinations rỗng", async () => {
    const result = await askAssistant(input, { generateFn: async () => ok(textResponse("Chào bạn!")), toolDeps: deps(), findSummaries });
    expect(result).toEqual({ reply: "Chào bạn!", destinations: [] });
  });

  it("giữ model dự phòng cho vòng sau", async () => {
    const generateFn = vi
      .fn<(input: GenerateInput) => Promise<GenerateResult>>()
      .mockResolvedValueOnce(ok(callResponse("get_policies", {}), env.AI_MODEL_LITE))
      .mockResolvedValueOnce(ok(textResponse("Chính sách..."), env.AI_MODEL_LITE));
    await askAssistant(input, { generateFn, toolDeps: deps(), findSummaries });
    expect(generateFn.mock.calls[1][0].models).toEqual([env.AI_MODEL_LITE]);
  });

  it.each([
    ["Gemini lỗi cả hai model", async (): Promise<GenerateResult> => ({ ok: false, reason: "ERROR", error: new Error("down") })],
    ["câu trả lời bị chặn", async () => ok(fakeResponse([{ text: "" }], "SAFETY"))],
    ["câu trả lời rỗng", async () => ok(textResponse("  "))],
    ["vượt số vòng tool", async () => ok(callResponse("get_policies", {}))],
  ])("%s → AI_UNAVAILABLE", async (_name, generateFn) => {
    const error = await askAssistant(input, { generateFn, toolDeps: deps(), findSummaries }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 503, code: "AI_UNAVAILABLE" });
    expect(findSummaries).not.toHaveBeenCalled();
  });

  it("lỗi DB trong tool → AI_UNAVAILABLE", async () => {
    const toolDeps = deps({
      findDestinations: vi.fn(async () => {
        throw new Error("db down");
      }) as never,
    });
    await expect(
      askAssistant(input, { generateFn: async () => ok(callResponse("search_destinations", {})), toolDeps, findSummaries }),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });
});
