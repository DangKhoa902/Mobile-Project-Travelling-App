import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, currentUser } from "../middlewares/auth.js";

// App gọi sau khi đăng nhập và mỗi lần mở app với Expo push token của thiết bị.
export const deviceRouter = Router();

deviceRouter.use(authenticate);

const tokenSchema = z
  .string()
  .trim()
  .regex(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/, "Không phải Expo push token hợp lệ");

deviceRouter.post("/", async (request, response) => {
  const { token, platform } = z
    .object({ token: tokenSchema, platform: z.enum(["IOS", "ANDROID", "WEB"]) })
    .parse(request.body);
  const userId = currentUser(request).id;
  // Một thiết bị đổi tài khoản thì token chuyển sang tài khoản mới.
  const data = await prisma.deviceToken.upsert({
    where: { token },
    create: { token, platform, userId },
    update: { userId, platform, lastSeenAt: new Date() },
  });
  response.status(201).json({ data });
});

// Gọi khi đăng xuất để thiết bị không nhận push của tài khoản cũ.
deviceRouter.delete("/", async (request, response) => {
  const { token } = z.object({ token: tokenSchema }).parse(request.body);
  await prisma.deviceToken.deleteMany({ where: { token, userId: currentUser(request).id } });
  response.status(204).end();
});

deviceRouter.get("/", async (request, response) => {
  response.json({
    data: await prisma.deviceToken.findMany({
      where: { userId: currentUser(request).id },
      select: { id: true, platform: true, createdAt: true, lastSeenAt: true },
    }),
  });
});
