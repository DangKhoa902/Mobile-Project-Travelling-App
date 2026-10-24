import { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { z } from "zod";
import { env } from "../config/env.js";
import { badRequest, forbidden, notFound } from "../lib/http-error.js";
import { idParamSchema } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { deleteImage, detectImageType, saveImage } from "../lib/storage.js";
import { authenticate, currentUser } from "../middlewares/auth.js";

// Tải ảnh lên trả URL; các API khác (hồ sơ, tin đăng, đánh giá) chỉ lưu URL đó.
export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024, files: 1 },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: { code: "TOO_MANY_REQUESTS", message: "Tải lên quá nhiều, vui lòng thử lại sau" },
});

const purposeSchema = z.object({ purpose: z.enum(["avatar", "destination", "review"]) });

// multipart/form-data: file=<ảnh>, purpose=avatar|destination|review
uploadRouter.post("/", authenticate, uploadLimiter, upload.single("file"), async (request, response) => {
  const user = currentUser(request);
  const { purpose } = purposeSchema.parse(request.body);
  if (purpose === "destination" && user.role !== "OWNER" && user.role !== "ADMIN") {
    throw forbidden("Chỉ chủ địa điểm hoặc admin tải ảnh địa điểm");
  }
  if (!request.file) throw badRequest("Thiếu file ảnh (trường \"file\")", "FILE_REQUIRED");

  const mime = detectImageType(request.file.buffer);
  if (!mime) throw badRequest("Chỉ nhận ảnh JPEG, PNG hoặc WebP", "INVALID_FILE_TYPE");

  const { key, url } = await saveImage(request.file.buffer, mime, purpose);
  const data = await prisma.upload.create({
    data: { userId: user.id, key, url, mimeType: mime, size: request.file.size, purpose },
    select: { id: true, url: true, mimeType: true, size: true, purpose: true, createdAt: true },
  });
  response.status(201).json({ data });
});

uploadRouter.delete("/:id", authenticate, async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const record = await prisma.upload.findUnique({ where: { id } });
  if (!record || record.userId !== currentUser(request).id) throw notFound("file");
  await deleteImage(record.key);
  await prisma.upload.delete({ where: { id } });
  response.status(204).end();
});
