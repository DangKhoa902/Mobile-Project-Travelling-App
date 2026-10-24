import nodemailer from "nodemailer";
import { env } from "../config/env.js";

type Mail = { to: string; subject: string; text: string; html?: string };

const transporter =
  env.EMAIL_TRANSPORT === "smtp"
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      })
    : null;

// EMAIL_TRANSPORT=console: không gửi thật, in nội dung ra log để dev/test lấy link.
export async function sendMail(mail: Mail) {
  if (!transporter) {
    if (env.NODE_ENV !== "test") console.log(`[mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return;
  }
  await transporter.sendMail({ from: env.MAIL_FROM, ...mail });
}

// Khi không gửi email thật (dev, test, demo), API trả kèm token để kiểm thử được luồng.
export const exposeDevTokens = () => env.EMAIL_TRANSPORT === "console" && env.NODE_ENV !== "production";
