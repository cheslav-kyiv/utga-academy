#!/usr/bin/env bash
# Діагностика хостингу перед встановленням Moodle 4.5 LTS. Нічого не змінює — лише читає й друкує.
#   bash scripts/check-server.sh              # PHP за замовчуванням
#   PHP=php8.3 bash scripts/check-server.sh   # конкретна версія PHP (на хостингу CloudLinux їх кілька)
PHP="${PHP:-php}"
echo "== Система";      uname -srm; whoami; echo "HOME=$HOME"; pwd
echo "== PHP (CLI): $PHP";    $PHP -v 2>&1 | head -1
echo "   php у PATH:";  ls -1 /usr/bin/php* /opt/*/php*/bin/php 2>/dev/null | head -20
echo "== Ліміти PHP";   $PHP -r 'foreach (["max_input_vars","memory_limit","max_execution_time","upload_max_filesize","post_max_size"] as $k) echo "   $k = ", ini_get($k), PHP_EOL;'
echo "== Розширення PHP (потрібні для Moodle)"
for e in pgsql mysqli intl mbstring xml xmlreader dom zip gd curl sodium soap openssl iconv json fileinfo opcache exif; do
  $PHP -m 2>/dev/null | grep -qix "$e" && echo "   + $e" || echo "   - $e  (НЕМАЄ)"
done
echo "== Інструменти";  for t in git unzip curl crontab mysql psql composer; do printf "   %-9s %s\n" "$t" "$(command -v $t || echo 'немає')"; done
echo "== База даних"; mysql --version 2>/dev/null || echo "   mysql-клієнт відсутній"
echo "== Мережа (вихідні з'єднання)"
for u in https://github.com https://download.moodle.org; do
  printf "   %-28s %s\n" "$u" "$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$u" 2>/dev/null || echo помилка)"
done
echo "== Диск";         df -h "$HOME" 2>/dev/null | tail -1; du -sh "$HOME" 2>/dev/null
echo "== Теки в домашній директорії"; ls -la "$HOME" | head -30
echo "== Cron поточного користувача"; crontab -l 2>&1 | head -10
