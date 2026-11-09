#!/usr/bin/env bash
# Локальне середовище розробки без Docker: PostgreSQL + вбудований вебсервер PHP.
# Потрібно: PHP 8.1–8.3 (pgsql, intl, mbstring, xml, zip, gd, curl, sodium), PostgreSQL 13+, git.
#   scripts/local-dev.sh            # встановлення + збирання курсів + сервер http://localhost:8080
# Логін адміністратора: admin / Admin#2026 (ЛИШЕ для локальної розробки).
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${WORK:-$REPO/.local}"
MOODLE="$WORK/moodle"; DATA="$WORK/moodledata"
PHP="php -d max_input_vars=5000"

mkdir -p "$WORK" "$DATA"
"$REPO/scripts/install-moodle.sh" "$MOODLE"

if [ ! -f "$MOODLE/config.php" ]; then
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='moodle'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER moodle WITH PASSWORD 'moodle' CREATEDB;"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='moodle'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE moodle OWNER moodle ENCODING 'UTF8' TEMPLATE template0;"
  $PHP "$MOODLE/admin/cli/install.php" --non-interactive --agree-license --lang=en \
    --wwwroot=http://localhost:8080 --dataroot="$DATA" --dbtype=pgsql --dbhost=localhost \
    --dbname=moodle --dbuser=moodle --dbpass=moodle --fullname="Академія УАТГ" --shortname="Академія УАТГ" \
    --adminuser=admin --adminpass='Admin#2026' --adminemail=admin@example.com
fi

$PHP "$REPO/provisioning/provision.php" --moodle="$MOODLE"
echo "Сервер: http://localhost:8080  (Ctrl+C — зупинити)"
exec $PHP -S localhost:8080 -t "$MOODLE"
