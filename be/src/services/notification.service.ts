import type { NotificationType } from "../generated/prisma/enums.js";
import { prisma, type TransactionClient } from "../lib/prisma.js";

type NotificationInput = {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

// Nhận transaction client để thông báo được tạo cùng lúc với thay đổi nghiệp vụ.
export function createNotification(input: NotificationInput, db: TransactionClient | typeof prisma = prisma) {
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
