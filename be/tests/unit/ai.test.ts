import { ApiError, GenerateContentResponse, type Content, type GenerateContentParameters } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { env } from "../../src/config/env.js";
import { generate, isRetryableError, type GeminiClient, type GenerateResult } from "../../src/lib/gemini.js";
import { badRequest } from "../../src/lib/http-error.js";
import {
  buildHistory,
  buildSystemPrompt,
  isAiPending,
  runSupportAgent,
  scheduleAiReply,
  STAFF_PREFIX,
} from "../../src/services/ai-support.service.js";
import { createCskhToolExecutor, policiesText, type ToolDeps } from "../../src/services/ai-tools.js";

// Gemini luôn được giả lập: không test nào gọi mạng hay DB.

function fakeResponse(parts: Record<string, unknown>[], finishReason = "STOP") {
  const response = new GenerateContentResponse();
  response.candidates = [{ content: { role: "model", parts }, finishReason: finishReason as never }];
  return response;
}
const textResponse = (text: string) => fakeResponse([{ text }]);
const callResponse = (name: string, args: Record<string, unknown>) =>
  fakeResponse([{ functionCall: { id: `call-${name}`, name, args }, thoughtSignature: "sig" }]);
const ok = (response: GenerateContentResponse, model = env.AI_MODEL_AGENT): GenerateResult => ({ ok: true, response, model });

describe("buildHistory", () => {
  it("tin khách là user, tin AI là model, tin nhân viên có tiền tố; gộp tin liền nhau cùng role", () => {
    const history = buildHistory(
      [
        { senderType: "USER", senderId: 7, content: "Xin chào" },
        { senderType: "USER", senderId: 7, content: "Mình cần hỏi booking" },
        { senderType: "AI", senderId: null, content: "Bạn cho mình mã booking nhé" },
        { senderType: "USER", senderId: 99, content: "Chị đã kiểm tra" },
      ],
      7,
    );
    expect(history.map((content) => content.role)).toEqual(["user", "model", "user"]);
    expect(history[0].parts).toHaveLength(2);
    expect(history[2].parts?.[0].text).toBe(`${STAFF_PREFIX}Chị đã kiểm tra`);
  });

  it("bỏ lượt model ở đầu để lịch sử luôn bắt đầu bằng user", () => {
    const history = buildHistory(
      [
        { senderType: "AI", senderId: null, content: "Chào bạn" },
        { senderType: "USER", senderId: 1, content: "Hi" },
      ],
      1,
    );
    expect(history).toEqual([{ role: "user", parts: [{ text: "Hi" }] }]);
  });
});

describe("buildSystemPrompt", () => {
  it("đưa ngày hôm nay theo giờ Việt Nam vào prompt", () => {
    const prompt = buildSystemPrompt({ subject: "Hỏi giá", bookingCode: "TA261104-ABCDEF", now: new Date("2026-11-04T18:30:00Z") });
    expect(prompt).toContain("2026-11-05");
    expect(prompt).toContain("TA261104-ABCDEF");
    expect(prompt).toContain("handoff_to_staff");
  });

  it("chính sách có hạn thanh toán và quy tắc hủy", () => {
    const text = policiesText(15);
    expect(text).toContain("15 phút");
    expect(text).toContain("CONFIRMED");
    expect(text).toContain("COMPLETED");
  });
});

describe("generate: chuỗi model dự phòng", () => {
  const input = { contents: [{ role: "user", parts: [{ text: "hi" }] }] as Content[], systemInstruction: "sys" };

  function client(impl: (params: GenerateContentParameters) => Promise<GenerateContentResponse>) {
    const generateContent = vi.fn(impl);
    return { generateContent, client: { models: { generateContent } } satisfies GeminiClient };
  }

  it("phân loại lỗi đáng thử lại", () => {
    expect(isRetryableError(new ApiError({ message: "quota", status: 429 }))).toBe(true);
    expect(isRetryableError(new ApiError({ message: "down", status: 503 }))).toBe(true);
    expect(isRetryableError(new ApiError({ message: "bad key", status: 400 }))).toBe(false);
    expect(isRetryableError(new DOMException("timeout", "TimeoutError"))).toBe(true);
  });

  it("model chính trả 429 thì thử model LITE", async () => {
    const fake = client(async (params) => {
      if (params.model === env.AI_MODEL_AGENT) throw new ApiError({ message: "quota", status: 429 });
      return textResponse("ok");
    });
    const result = await generate(input, fake.client);
    expect(result.ok && result.model).toBe(env.AI_MODEL_LITE);
    expect(fake.generateContent.mock.calls.map(([params]) => params.model)).toEqual([env.AI_MODEL_AGENT, env.AI_MODEL_LITE]);
    // Tắt automatic function calling, có timeout.
    const config = fake.generateContent.mock.calls[0][0].config!;
    expect(config.automaticFunctionCalling).toEqual({ disable: true });
    expect(config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("lỗi 4xx khác không thử model dự phòng", async () => {
    const fake = client(async () => {
      throw new ApiError({ message: "bad", status: 400 });
    });
    const result = await generate(input, fake.client);
    expect(result.ok).toBe(false);
    expect(fake.generateContent).toHaveBeenCalledTimes(1);
  });

  it("cả hai model lỗi trả ok = false", async () => {
    const fake = client(async () => {
      throw new ApiError({ message: "down", status: 500 });
    });
    const result = await generate(input, fake.client);
    expect(result.ok).toBe(false);
    expect(fake.generateContent).toHaveBeenCalledTimes(2);
  });
});

describe("runSupportAgent: quyết định trả lời / chuyển nhân viên", () => {
  const base = { contents: [{ role: "user", parts: [{ text: "Hủy giúp mình booking" }] }] as Content[], systemInstruction: "sys" };

  it("model trả text thì trả lời khách", async () => {
    const outcome = await runSupportAgent({ ...base, executeTool: vi.fn(), generateFn: async () => ok(textResponse("Chào bạn")) });
    expect(outcome).toEqual({ kind: "reply", text: "Chào bạn", model: env.AI_MODEL_AGENT });
  });

  it("gọi tool rồi gửi lại Content của model (có thoughtSignature) và kết quả tool", async () => {
    const executeTool = vi.fn(async () => ({ policies: "..." }));
    const generateFn = vi
      .fn<(input: { contents: Content[] }) => Promise<GenerateResult>>()
      .mockResolvedValueOnce(ok(callResponse("get_policies", {})))
      .mockResolvedValueOnce(ok(textResponse("Theo chính sách...")));
    const outcome = await runSupportAgent({ ...base, executeTool, generateFn });
    expect(outcome.kind).toBe("reply");
    expect(executeTool).toHaveBeenCalledWith("get_policies", {});
    const secondContents = generateFn.mock.calls[1][0].contents;
    expect(secondContents).toHaveLength(3);
    expect(secondContents[1].parts?.[0].thoughtSignature).toBe("sig");
    expect(secondContents[2].parts?.[0].functionResponse).toMatchObject({ id: "call-get_policies", name: "get_policies", response: { result: { policies: "..." } } });
  });

  it("tool handoff_to_staff → chuyển nhân viên với lý do và tóm tắt của AI", async () => {
    const outcome = await runSupportAgent({
      ...base,
      executeTool: vi.fn(),
      generateFn: async () => ok(callResponse("handoff_to_staff", { reason: "Khách muốn hoàn tiền", summary: "Booking TA1, muốn hoàn tiền" })),
    });
    expect(outcome).toEqual({ kind: "handoff", reason: "Khách muốn hoàn tiền", summary: "Booking TA1, muốn hoàn tiền", cause: "TOOL" });
  });

  it("Gemini lỗi → chuyển nhân viên AI_ERROR", async () => {
    const outcome = await runSupportAgent({ ...base, executeTool: vi.fn(), generateFn: async () => ({ ok: false, reason: "ERROR", error: new Error("x") }) });
    expect(outcome).toMatchObject({ kind: "handoff", reason: "AI_ERROR", cause: "ERROR" });
  });

  it("câu trả lời bị chặn hoặc rỗng → AI_ERROR", async () => {
    const blocked = await runSupportAgent({ ...base, executeTool: vi.fn(), generateFn: async () => ok(fakeResponse([{ text: "" }], "SAFETY")) });
    expect(blocked).toMatchObject({ kind: "handoff", reason: "AI_ERROR" });
    const empty = await runSupportAgent({ ...base, executeTool: vi.fn(), generateFn: async () => ok(textResponse("   ")) });
    expect(empty).toMatchObject({ kind: "handoff", reason: "AI_ERROR" });
  });

  it("vượt số vòng tool → AI_ERROR, không gọi tool quá maxRounds lần", async () => {
    const executeTool = vi.fn(async () => ({}));
    const outcome = await runSupportAgent({ ...base, executeTool, maxRounds: 2, generateFn: async () => ok(callResponse("get_policies", {})) });
    expect(outcome).toMatchObject({ kind: "handoff", reason: "AI_ERROR" });
    expect(executeTool).toHaveBeenCalledTimes(2);
  });

  it("đã chuyển sang model dự phòng thì các vòng sau giữ model đó", async () => {
    const generateFn = vi
      .fn<(input: { models?: string[] }) => Promise<GenerateResult>>()
      .mockResolvedValueOnce(ok(callResponse("get_policies", {}), env.AI_MODEL_LITE))
      .mockResolvedValueOnce(ok(textResponse("xong"), env.AI_MODEL_LITE));
    await runSupportAgent({ ...base, executeTool: vi.fn(async () => ({})), generateFn });
    expect(generateFn.mock.calls[0][0].models).toBeUndefined();
    expect(generateFn.mock.calls[1][0].models).toEqual([env.AI_MODEL_LITE]);
  });
});

describe("tool CSKH: phạm vi dữ liệu và PII", () => {
  const booking = (userId: number) => ({
    id: 5,
    userId,
    code: "TA261104-ABCDEF",
    status: "CONFIRMED",
    checkInDate: new Date("2027-01-10T00:00:00Z"),
    checkOutDate: new Date("2027-01-12T00:00:00Z"),
    nights: 2,
    guests: 2,
    roomsCount: 1,
    subtotal: 2_000_000,
    discountAmount: 0,
    taxAmount: 160_000,
    totalAmount: 2_160_000,
    contactName: "Nguyễn Văn A",
    contactPhone: "0901234567",
    contactEmail: "khach@example.com",
    note: "Số nhà 12 Lê Lợi",
    commissionAmount: 200_000,
    paymentDueAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date("2026-11-01T00:00:00Z"),
    user: { id: userId, name: "A", email: "khach@example.com", phone: "0901234567" },
    destination: { id: 1, name: "Resort", slug: "resort", location: "Đà Lạt", imageUrl: null, ownerId: 3 },
    package: { id: 1, name: "Gói 2N1Đ", durationDays: 2, durationNights: 1, freeCancellationHours: 48 },
    roomType: { id: 1, name: "Deluxe", capacity: 2 },
    payment: { method: "ONLINE_MOCK", status: "PAID", paidAt: new Date("2026-11-01T00:05:00Z") },
    voucher: null,
    services: [{ quantity: 1, addonService: { id: 1, name: "Đưa đón", pricingUnit: "PER_BOOKING" } }],
  });

  function deps(overrides: Partial<ToolDeps> = {}): ToolDeps {
    return {
      findDestinations: vi.fn(async () => [[], 0]) as never,
      findDestination: vi.fn(async () => null) as never,
      quoteBooking: vi.fn() as never,
      listBookings: vi.fn(async () => ({ data: [booking(7)], total: 1 })) as never,
      getBooking: vi.fn(async () => booking(7)) as never,
      findBookingIdByCode: vi.fn(async () => 5),
      ...overrides,
    };
  }

  it("list_my_bookings luôn gọi với role USER, scope mine và không chứa PII", async () => {
    const d = deps();
    const result = await createCskhToolExecutor({ id: 7 }, d)("list_my_bookings", { status: "CONFIRMED" });
    expect(d.listBookings).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, role: "USER" }),
      expect.objectContaining({ scope: "mine", status: "CONFIRMED" }),
    );
    const json = JSON.stringify(result);
    expect(json).toContain("TA261104-ABCDEF");
    for (const pii of ["khach@example.com", "0901234567", "Nguyễn Văn A", "Lê Lợi", "commission"]) expect(json).not.toContain(pii);
  });

  it("list_my_bookings bỏ booking không phải của khách (phòng thủ)", async () => {
    const d = deps({ listBookings: vi.fn(async () => ({ data: [booking(7), booking(8)], total: 2 })) as never });
    const result = await createCskhToolExecutor({ id: 7 }, d)("list_my_bookings", {});
    expect(result.bookings).toHaveLength(1);
  });

  it("get_my_booking chỉ tìm mã trong booking của khách và trả khả năng tự hủy", async () => {
    const d = deps();
    const result = await createCskhToolExecutor({ id: 7 }, d)("get_my_booking", { code: "ta261104-abcdef" });
    expect(d.findBookingIdByCode).toHaveBeenCalledWith(7, "TA261104-ABCDEF");
    expect(result).toHaveProperty("customerCanCancel");
    expect(JSON.stringify(result)).not.toContain("khach@example.com");
  });

  it("get_my_booking với booking của người khác trả NOT_FOUND", async () => {
    const notMine = await createCskhToolExecutor({ id: 7 }, deps({ getBooking: vi.fn(async () => booking(8)) as never }))("get_my_booking", { code: "X" });
    expect(notMine).toEqual({ error: { code: "NOT_FOUND", message: expect.any(String) } });
    const missing = await createCskhToolExecutor({ id: 7 }, deps({ findBookingIdByCode: vi.fn(async () => null) }))("get_my_booking", { code: "X" });
    expect(missing).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  it("lỗi nghiệp vụ từ service trả về cho AI dạng { error }", async () => {
    const d = deps({ quoteBooking: vi.fn(async () => { throw badRequest("Ngày nhận phòng không được ở quá khứ", "INVALID_DATES"); }) as never });
    const result = await createCskhToolExecutor({ id: 7 }, d)("quote_booking", {
      packageId: 1,
      roomTypeId: 1,
      checkInDate: "2020-01-01",
      checkOutDate: "2020-01-02",
      guests: 2,
    });
    expect(result).toEqual({ error: { code: "INVALID_DATES", message: "Ngày nhận phòng không được ở quá khứ" } });
    expect(d.quoteBooking).toHaveBeenCalledWith(expect.objectContaining({ roomsCount: 1, services: [] }));
  });

  it("quote_booking thiếu tham số trả VALIDATION_ERROR, tool lạ trả UNKNOWN_TOOL", async () => {
    const execute = createCskhToolExecutor({ id: 7 }, deps());
    expect(await execute("quote_booking", { packageId: 1 })).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(await execute("delete_everything", {})).toMatchObject({ error: { code: "UNKNOWN_TOOL" } });
  });

  it("search_destinations chỉ tìm tin APPROVED đang hoạt động, tối đa 5 kết quả", async () => {
    const d = deps();
    await createCskhToolExecutor({ id: 7 }, d)("search_destinations", { q: "Đà Lạt", categorySlug: "resort", limit: 50 });
    const [query, where, skip, take] = (d.findDestinations as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(where).toMatchObject({ isActive: true, listingStatus: "APPROVED", category: { slug: "resort" } });
    expect(query.limit).toBe(5);
    expect([skip, take]).toEqual([0, 5]);
  });

  it("get_destination không trả tin chưa duyệt", async () => {
    const d = deps({ findDestination: vi.fn(async () => ({ isActive: true, listingStatus: "PENDING_REVIEW" })) as never });
    expect(await createCskhToolExecutor({ id: 7 }, d)("get_destination", { slug: "x" })).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});

describe("scheduleAiReply: aiPending và hàng đợi", () => {
  it("không chạy hai lượt cùng lúc; tin mới khi đang chạy → chạy thêm một lượt", async () => {
    let running = 0;
    let maxRunning = 0;
    let release!: () => void;
    const firstRunGate = new Promise<void>((resolve) => (release = resolve));
    const reply = vi.fn(async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      if (reply.mock.calls.length === 1) await firstRunGate;
      running -= 1;
    });

    const done = scheduleAiReply(4242, reply);
    expect(isAiPending(4242)).toBe(true);
    await new Promise((resolve) => setImmediate(resolve));
    // Hai tin mới trong lúc lượt đầu đang chạy chỉ gây thêm một lượt.
    await scheduleAiReply(4242, reply);
    await scheduleAiReply(4242, reply);
    release();
    await done;

    expect(reply).toHaveBeenCalledTimes(2);
    expect(maxRunning).toBe(1);
    expect(isAiPending(4242)).toBe(false);
  });
});

describe("toPlainText", () => {
  it("bỏ Markdown mà app không hiển thị được", async () => {
    const { toPlainText } = await import("../../src/services/ai-support.service.js");
    expect(toPlainText("## Gợi ý\nSàn có **Mỹ Khê Beach Hotel** và __Pine Hill__\n* Hồ bơi\n* Gần biển")).toBe(
      "Gợi ý\nSàn có Mỹ Khê Beach Hotel và Pine Hill\n- Hồ bơi\n- Gần biển",
    );
  });
});
