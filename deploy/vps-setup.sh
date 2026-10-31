#!/bin/sh
# Chuẩn bị VPS Ubuntu 22.04/24.04 mới tạo: cập nhật hệ thống, cài Docker, bật tường lửa.
# Chạy MỘT lần với quyền root:  sh deploy/vps-setup.sh
set -e

apt-get update && apt-get upgrade -y
apt-get install -y git curl ufw

# Docker Engine + Compose plugin (script chính thức của Docker).
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

# Chỉ mở SSH, HTTP, HTTPS. API (3000) và MariaDB (3306) không mở ra Internet.
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# Swap 2 GB: VPS 1–2 GB RAM dễ hết bộ nhớ khi build image / build web.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

docker --version && docker compose version
echo "Xong. Tiếp theo: git clone repo, tạo .env (deploy/env.production.example), chạy deploy/deploy.sh"
