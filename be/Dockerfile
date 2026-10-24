# ---------- Build ----------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# prisma.config.ts đọc DATABASE_URL; lúc build chỉ cần generate nên dùng giá trị giả.
RUN DATABASE_URL="mysql://build:build@localhost:3306/build" npm run build

# ---------- Runtime ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
# prisma/ + prisma.config.ts cho migrate deploy; src/ để chạy được seed demo bằng tsx.
COPY --from=build /app/src ./src
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./

# Thư mục ảnh khi STORAGE_DRIVER=local (gắn volume trong docker-compose).
RUN mkdir -p /app/uploads && chown node:node /app/uploads

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" || exit 1

# Áp dụng migration còn thiếu rồi mới khởi động API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
