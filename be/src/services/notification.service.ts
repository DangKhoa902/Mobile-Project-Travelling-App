import type { NotificationType, Role } from "../generated/prisma/enums.js";
import { prisma, type TransactionClient } from "../lib/prisma.js";

type Db = TransactionClient | typeof prisma;

type NotificationInput = {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

// Nhận transaction client để thông báo được tạo cùng lúc với thay đổi nghiệp vụ.
export function createNotification(input: NotificationInput, db: Db = prisma) {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data as object | undefined,
    },
  });
}

// Gửi cho toàn bộ tài khoản của các vai trò, ví dụ báo admin có tin đăng chờ duyệt.
export async function notifyRoles(roles: Role[], input: Omit<NotificationInput, "userId">, db: Db = prisma) {
  const users = await db.user.findMany({ where: { role: { in: roles }, status: "ACTIVE" }, select: { id: true } });
  if (users.length === 0) return;
  await db.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data as object | undefined,
    })),
  });
}
