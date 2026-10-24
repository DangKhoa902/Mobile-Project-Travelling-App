import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import { randomToken } from "./crypto.js";

export const ALLOWED_IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export type ImageMime = keyof typeof ALLOWED_IMAGE_TYPES;

// Kiểm tra chữ ký file thay vì tin header Content-Type do client gửi.
export function detectImageType(buffer: Buffer): ImageMime | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

const s3 =
  env.STORAGE_DRIVER === "s3"
    ? new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        // MinIO và nhiều dịch vụ tương thích S3 cần path-style.
        forcePathStyle: Boolean(env.S3_ENDPOINT),
        credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
      })
    : null;

export const localUploadRoot = path.resolve(env.UPLOAD_DIR);

// key dạng review/2026-10/Xy3...k.jpg; tên ngẫu nhiên nên không đoán được và không trùng.
export async function saveImage(buffer: Buffer, mime: ImageMime, folder: string) {
  const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomToken(16)}.${ALLOWED_IMAGE_TYPES[mime]}`;
  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { key, url: `${env.S3_PUBLIC_URL!.replace(/\/$/, "")}/${key}` };
  }
  const filePath = path.join(localUploadRoot, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return { key, url: `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/uploads/${key}` };
}

export async function deleteImage(key: string) {
  if (s3) {
    await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    return;
  }
  await unlink(path.join(localUploadRoot, key)).catch(() => undefined);
}
