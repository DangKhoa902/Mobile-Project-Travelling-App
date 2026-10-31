#!/bin/sh
# Build bản web + khởi động (hoặc cập nhật) API, DB, Caddy trên VPS.
# Chạy từ thư mục gốc của repo:  sh deploy/deploy.sh
set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Thiếu .env – tạo từ deploy/env.production.example trước." >&2
  exit 1
fi

# Bản web: build trong container Node (VPS không cần cài Node). Địa chỉ API nhúng lúc build (fe/.env.production).
echo "==> Build web"
docker run --rm -v "$PWD/fe":/app -w /app node:24 sh -c "npm ci && npx expo export --platform web --clear"

echo "==> Khởi động API, DB, Caddy"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "==> Trạng thái"
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
echo "Kiểm tra: curl https://api.chantroixaxoi.xyz/health  và mở https://app.chantroixaxoi.xyz"
