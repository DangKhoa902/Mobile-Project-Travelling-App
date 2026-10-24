import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

type ExpoTicket = { status: "ok" | "error"; id?: string; message?: string; details?: { error?: string } };

// Outbox: thông báo được tạo trong transaction nghiệp vụ, job này gửi push sau khi đã commit.
// Không gửi trực tiếp trong transaction để lỗi mạng không làm hỏng thao tác chính.
export async function dispatchPendingPush() {
  // Thông báo quá 24 giờ chưa gửi (ví dụ lúc push đang tắt) không gửi dồn nữa.
  await prisma.notification.updateMany({
    where: { pushedAt: null, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    data: { pushedAt: new Date() },
  });
  const pending = await prisma.notification.findMany({
    where: { pushedAt: null },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true, userId: true, title: true, body: true, data: true, user: { select: { deviceTokens: { select: { token: true } } } } },
  });
  if (pending.length === 0) return 0;

  const messages = pending.flatMap((item) =>
    item.user.deviceTokens.map((device) => ({
      to: device.token,
      title: item.title,
      body: item.body,
      data: { notificationId: item.id, ...((item.data as object | null) ?? {}) },
      sound: "default" as const,
    })),
  );

  if (messages.length > 0) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(messages),
    });
    // Lỗi mạng / Expo lỗi: giữ nguyên để lần chạy sau gửi lại.
    if (!response.ok) throw new Error(`Expo push failed with HTTP ${response.status}`);

    const { data: tickets } = (await response.json()) as { data: ExpoTicket[] };
    // Thiết bị đã gỡ app hoặc đăng xuất: xóa token để không gửi nữa.
    const dead = tickets
      .map((ticket, index) => (ticket.details?.error === "DeviceNotRegistered" ? messages.at(index)?.to : undefined))
      .filter((token): token is string => Boolean(token));
    if (dead.length) await prisma.deviceToken.deleteMany({ where: { token: { in: dead } } });
  }

  // Người không có thiết bị cũng đánh dấu đã xử lý (vẫn xem được trong hộp thư).
  await prisma.notification.updateMany({ where: { id: { in: pending.map((item) => item.id) } }, data: { pushedAt: new Date() } });
  return messages.length;
}
