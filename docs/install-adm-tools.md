# Встановлення на academy.psgua.com (хостинг adm.tools)

Покрокова інструкція саме для акаунта `uaguides`. Виконувати **після** переходу бази на MySQL 8.4.

| Що | Значення |
|---|---|
| Код Moodle (корінь сайту) | `/home/uaguides/psgua.com/academy` |
| Дані Moodle (`moodledata`, поза сайтом) | `/home/uaguides/moodledata-academy` |
| Репозиторій платформи | `/home/uaguides/utga-academy` |
| PHP у консолі | **`php8.3`** (не `php` — це 5.6) |
| Сервер бази | `uaguides.mysql.tools`, тип `mysqli` |
| Адреса | `https://academy.psgua.com` |

## 0. Перед початком (у панелі adm.tools)

- [ ] MySQL акаунта — **8.4** (Бази даних → Налаштування)
- [ ] academy.psgua.com: PHP **8.3**, `max_input_vars` **5000**, `max_execution_time` **300**, `display_errors` **вимкнено**, `open_basedir` **/home/uaguides**
- [ ] SSL Let's Encrypt для academy.psgua.com увімкнено, `https://academy.psgua.com` відкривається
- [ ] Створено базу даних (Бази даних → Створити), напр. `uaguides_academy`; пароль збережено в надійному місці

## 1. Код (SSH-консоль)

```bash
cd /home/uaguides && git clone https://github.com/cheslav-kyiv/utga-academy.git
```

Заглушку хостингу прибираємо (git не клонує в непорожню теку), потім завантажуємо Moodle 4.5 + mod_customcert:

```bash
rm /home/uaguides/psgua.com/academy/index.html && bash /home/uaguides/utga-academy/scripts/install-moodle.sh /home/uaguides/psgua.com/academy
```

```bash
mkdir -p /home/uaguides/moodledata-academy && chmod 750 /home/uaguides/moodledata-academy
```

## 2. Встановлення Moodle

Пароль бази вводиться приховано (не потрапляє в історію команд):

```bash
read -s -p "Пароль бази: " DBPASS; echo; read -s -p "Пароль адміністратора Moodle: " ADMINPASS; echo
```

```bash
cd /home/uaguides/psgua.com/academy && php8.3 -d max_input_vars=5000 admin/cli/install.php --non-interactive --agree-license --lang=uk --wwwroot=https://academy.psgua.com --dataroot=/home/uaguides/moodledata-academy --dbtype=mysqli --dbhost=uaguides.mysql.tools --dbname=uaguides_academy --dbuser=uaguides_academy --dbpass="$DBPASS" --fullname="Академія ГС «ВАГ» — навчання та підвищення кваліфікації" --shortname="Академія ГС «ВАГ»" --adminuser=admin --adminpass="$ADMINPASS" --adminemail=info@uaguides.com; unset DBPASS ADMINPASS
```

> Якщо `--lang=uk` не спрацює (мовний пакет не завантажився) — повторіть з `--lang=en`; `provision.php` спробує встановити українську пізніше.

## 3. Налаштування сайту й курси

```bash
cd /home/uaguides/utga-academy && php8.3 -d max_input_vars=5000 provisioning/provision.php --moodle=/home/uaguides/psgua.com/academy
```

## 4. Cron (панель adm.tools → «Розклад завдань (cron)»)

Команда, **щохвилини**:

```
/usr/bin/php8.3 /home/uaguides/psgua.com/academy/admin/cli/cron.php
```

Якщо тариф не дозволяє запуск щохвилини — найменший доступний інтервал (бейджі й завершення курсу тоді з'являтимуться із затримкою).

## 5. Перевірка

- `https://academy.psgua.com` → увійти як `admin` → **Адміністрування сайту → Сповіщення**: без червоних помилок.
- **Адміністрування → Сервер → Середовище**: усі «OK» (опції, позначені як рекомендовані, — за можливості).
- **Адміністрування → Сервер → Електронна пошта → Вихідна пошта**: SMTP (див. `docs/deploy-psgua.md`).
- Наскрізний тест **не запускати** на робочому сайті — він створює тестових користувачів.

## Відкат

Якщо встановлення зірвалося до запуску для слухачів: видалити вміст `/home/uaguides/psgua.com/academy` і `/home/uaguides/moodledata-academy`, очистити базу `uaguides_academy` у phpMyAdmin і почати з кроку 1.
