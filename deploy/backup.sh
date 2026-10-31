#!/bin/sh
# Sao lưu DB + ảnh tải lên, giữ 14 ngày. Chạy hằng ngày bằng cron:
#   crontab -e  →  0 3 * * * sh ~/travelling/deploy/backup.sh >> ~/travelling/backups/backup.log 2>&1
set -e
cd "$(dirname "$0")/.."
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p backups

docker compose exec -T db sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines travelling_app' \
  | gzip > "backups/db-$STAMP.sql.gz"

# Tên volume = <tên thư mục repo>_uploads (xem: docker volume ls).
VOLUME="$(basename "$PWD")_uploads"
docker run --rm -v "$VOLUME":/data -v "$PWD/backups":/backup alpine tar czf "/backup/uploads-$STAMP.tgz" -C /data .

find backups -type f -mtime +14 -delete
echo "Đã sao lưu: backups/db-$STAMP.sql.gz, backups/uploads-$STAMP.tgz"
