import type { Request } from "express";
import { prisma, type TransactionClient } from "../lib/prisma.js";

type Db = TransactionClient | typeof prisma;

export type AuditInput = {
  actorId: number | null;
  // Dạng "<đối tượng>.<hành động>", ví dụ "user.lock", "partner.approve", "payout.pay".
  action: string;
  entity: string;
  entityId?: string | number | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
};

// Ghi trong cùng transaction với thay đổi để không có thao tác nào thiếu nhật ký.
export function audit(input: AuditInput, db: Db = prisma) {
  return db.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId == null ? null : String(input.entityId),
      before: toJson(input.before),
      after: toJson(input.after),
      ip: input.ip ?? null,
    },
  });
}

export const requestIp = (request: Request) => request.ip ?? null;

// Date/BigInt không đi qua JSON được; chuẩn hóa trước khi lưu.
function toJson(value: unknown) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as object;
}
