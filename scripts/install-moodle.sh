#!/usr/bin/env bash
# Завантажує Moodle 4.5 LTS та плагін PDF-сертифікатів у вказану теку.
#   scripts/install-moodle.sh /var/www/moodle
# Далі: встановлення Moodle (веб-майстер або admin/cli/install.php) і provisioning/provision.php — див. docs/deploy-psgua.md
set -euo pipefail

TARGET="${1:?Вкажіть теку для Moodle, напр. /var/www/moodle}"
MOODLE_BRANCH="MOODLE_405_STABLE"        # Moodle 4.5 LTS
CUSTOMCERT_BRANCH="MOODLE_404_STABLE"    # протестовано з Moodle 4.5.15+ (окремої гілки 4.5 у плагіна немає)

if [ ! -d "$TARGET/.git" ]; then
  git clone --depth 1 -b "$MOODLE_BRANCH" https://github.com/moodle/moodle.git "$TARGET"
else
  git -C "$TARGET" pull --ff-only
fi

if [ ! -d "$TARGET/mod/customcert/.git" ]; then
  git clone --depth 1 -b "$CUSTOMCERT_BRANCH" https://github.com/mdjnelson/moodle-mod_customcert.git "$TARGET/mod/customcert"
else
  git -C "$TARGET/mod/customcert" pull --ff-only
fi

echo "Готово: Moodle ($MOODLE_BRANCH) + mod_customcert ($CUSTOMCERT_BRANCH) у $TARGET"
