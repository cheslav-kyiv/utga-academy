# Лендінг мітапу ГС «ВАГ»

Сторінка анонсу та реєстрації на онлайн-мітапи ГС «Всеукраїнська асоціація гідів».
Перша подія: **«Інтерпретація спадщини: новітня мілітарна історія України»**.

**Стек:** Next.js 15 (App Router), TypeScript, Tailwind CSS 4, lucide-react, шрифти Inter + Manrope (self-hosted через `@fontsource`, без запитів до Google Fonts).

## Статус

| Статус | Елемент | Підтвердження |
|---|---|---|
| 🟢 Перевірено локально | `npm run build`, `tsc --noEmit`, `eslint` — без помилок | Збірка 21.11.2026 |
| 🟢 Перевірено локально | `/api/register`: валідація на сервері, honeypot, ліміт запитів, номер підтвердження, маскування email у логах | curl-запити: 422 / 201 / honeypot |
| 🟢 Перевірено локально | Автоматичний аудит axe-core (WCAG 2.0/2.1 A/AA) — 0 порушень: десктоп, мобільний (`prefers-reduced-motion: reduce`), форма в стані помилок | Playwright + `@axe-core/playwright` 4.10.2 |
| 🟢 Перевірено локально | Клавіатура: skip-link першим Tab; після невдалої відправки фокус на зведенні помилок; після успішної — на заголовку підтвердження | Playwright |
| 🟡 Плейсхолдери | Дата, спікери, кількість місць, платформа, текст політики конфіденційності, емблема | Позначено `TODO` у `src/data/meetupData.ts` і `src/app/privacy/page.tsx`; затверджує Правління |
| 🟡 Не перевірено | Реальна доставка у вебхук / Telegram | Код готовий; потрібні реальні URL / токени |
| 🔵 Заплановано | Ручний аудит доступності (NVDA / VoiceOver, збільшення 200–400 %) | «0 порушень axe» ≠ відповідність WCAG 2.1 AA |

## Структура

```
meetup/
├─ src/data/meetupData.ts          ← УВЕСЬ зміст: подія, програма, спікери, FAQ, реквізити
├─ src/app/
│  ├─ layout.tsx                   мова uk, шрифти, skip-link, метадані
│  ├─ page.tsx                     збирає секції + JSON-LD schema.org/Event
│  ├─ privacy/page.tsx             політика конфіденційності (чернетка)
│  ├─ globals.css                  дизайн-токени, фокус-стейти, reduced-motion, forced-colors
│  └─ api/
│     ├─ register/route.ts         POST: прийом заявок
│     └─ calendar/route.ts         GET: .ics-файл події
├─ src/components/
│  ├─ sections/                    Header, Hero, Relevance, Audience, Program, Speakers,
│  │                               Outcomes, Registration, Faq, Footer
│  └─ ui/                          Logo (SVG-емблема), Reveal (поява при скролі), SectionHeading
└─ src/lib/
   ├─ validation.ts                спільна валідація (клієнт + сервер)
   ├─ integrations.ts              вебхук, Telegram, резервний JSONL-файл
   ├─ calendar.ts                  посилання Google Calendar + генерація .ics (RFC 5545)
   └─ datetime.ts                  форматування дат за Києвом
```

## Запуск локально

```bash
cd meetup
npm install
npm run dev          # http://localhost:3000
```

Продакшн-перевірка: `npm run build && npm start`. Перевірки: `npm run lint`, `npm run typecheck`.

## Підготовка наступного мітапу

Змінюйте лише `src/data/meetupData.ts`:

- `event` — назва, оффер, `startsAt` / `endsAt` (ISO з `+02:00`/`+03:00`), `seats`, `slug` (новий для кожної події — він іде в UID календаря), `registrationOpen: false` закриває прийом заявок;
- `program`, `speakers` (фото — у `public/speakers/`, поле `photo`; `placeholder: false` прибирає позначку «Склад уточнюється»), `faq`, `outcomes`.

Термінологія — за `../CLAUDE.md`: лише «туристичний гід»; сертифікат мітапу — **сертифікат участі**, без годин і ЄКТС.

## Підключення збору заявок

Скопіюйте `.env.example` у `.env.local` (локально) або задайте змінні на хостингу.

| Змінна | Що робить |
|---|---|
| `REGISTRATION_WEBHOOK_URL` | POST JSON `{ type: "meetup.registration", event, data }` на будь-який вебхук: Make, n8n, Zapier або Google Apps Script → Google Sheets |
| `REGISTRATION_WEBHOOK_SECRET` | (необов'язково) надсилається в заголовку `X-Webhook-Secret` — перевіряйте його на стороні вебхука |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | сповіщення організаторам у Telegram-чат / канал (бот має бути доданий у чат) |
| `NEXT_PUBLIC_SITE_URL` | канонічна адреса сайту для Open Graph |

Логіка доставки:

- **Жодної змінної не задано** → заявки дописуються в `meetup/.data/registrations.jsonl` (у `.gitignore`). Працює локально й на власному Node-сервері; **на Vercel / serverless файл не збережеться** — там обов'язково налаштуйте вебхук або Telegram.
- **Налаштовано хоча б один канал** → заявка вважається прийнятою, якщо її прийняв хоча б один канал; якщо всі впали — користувач бачить помилку (502) з контактним email, а не хибне «успішно».

### Google Sheets через Apps Script (мінімальний приклад)

У таблиці: *Розширення → Apps Script*, вставте й опублікуйте як вебзастосунок (доступ: «Будь-хто»), URL — у `REGISTRATION_WEBHOOK_URL`:

```js
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  // Перевірку секрету робіть через параметр у URL (?key=...), бо Apps Script не бачить заголовків запиту
  const d = body.data;
  SpreadsheetApp.getActiveSheet().appendRow([
    d.createdAt, d.id, d.fullName, d.email, d.contact, d.city, d.status, d.question,
  ]);
  return ContentService.createTextOutput("ok");
}
```

## Обмеження, про які варто знати

- Ліміт запитів (5 / 10 хв на IP) зберігається в пам'яті процесу — на кількох інстансах / serverless він неточний; для продакшну з навантаженням — Redis / Upstash або Cloudflare Turnstile.
- Сервер **не надсилає** листів-підтверджень учасникам; номер підтвердження показується лише на екрані. Розсилку посилань і сертифікатів треба налаштувати окремо (наприклад, сценарієм у Make / n8n від того ж вебхука).
- Сертифікат участі цей застосунок не генерує — його видає Академія / Moodle або окремий процес Асоціації.
