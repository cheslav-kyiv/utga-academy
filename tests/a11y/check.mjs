// Автоматична перевірка WCAG 2.1 A/AA (axe-core) ключових сторінок Академії.
// Автоматика знаходить лише частину проблем (~30–40%); ручна перевірка — див. docs/accessibility-wcag21aa.md.
//
// Змінні середовища:
//   MOODLE_URL   — адреса сайту (типово http://localhost:8080)
//   A11Y_USER / A11Y_PASS — обліковий запис слухача, який пройшов курс (див. tests/smoke_learner_journey.php --password)
//   COURSE_ID    — id курсу
//   VERIFY_CODE  — код сертифіката;  BADGE_HASH — хеш виданого бейджа
//   REPORT       — куди зберегти JSON-звіт (типово a11y-report.json)
//   CHROMIUM_PATH — (необов'язково) шлях до Chromium

import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { AxeBuilder } = await import('@axe-core/playwright');

const base = (process.env.MOODLE_URL || 'http://localhost:8080').replace(/\/$/, '');
const env = (k) => process.env[k] || '';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// CHROMIUM_PATH — шлях до вже встановленого Chromium (якщо не виконували `npx playwright install`).
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await (await browser.newContext({ locale: 'uk-UA' })).newPage();
const results = [];
const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(e.message));

async function audit(label, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  // Видимі вікна з помилками (напр. збій AJAX) — теж дефект, навіть якщо axe їх не бачить.
  const errorModal = await page.$$eval('.modal.show', (ms) => ms.map((m) => m.innerText.trim()).filter(Boolean));
  for (const t of errorModal) {
    r.violations.push({ id: 'error-modal', impact: 'serious', help: `Вікно з помилкою: ${t.replace(/\s+/g, ' ').slice(0, 120)}`,
      nodes: [{ target: ['.modal.show'] }] });
  }
  while (jsErrors.length) {
    r.violations.push({ id: 'js-error', impact: 'serious', help: `Помилка JavaScript: ${jsErrors.shift().slice(0, 120)}`,
      nodes: [{ target: ['window'] }] });
  }
  const v = r.violations.map((x) => ({ id: x.id, impact: x.impact, help: x.help, nodes: x.nodes.length,
    targets: x.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
  results.push({ label, url: page.url(), violations: v });
  console.log(`${v.length ? '✘' : '✔'} ${label} — порушень: ${v.length}`);
  for (const x of v) console.log(`    [${x.impact}] ${x.id}: ${x.help} (${x.nodes})  ${x.targets.join(' | ')}`);
}

// Публічні сторінки (без входу).
await audit('Сторінка входу', `${base}/login/index.php`);
if (env('VERIFY_CODE')) await audit('Перевірка сертифіката', `${base}/mod/customcert/verify_certificate.php?code=${env('VERIFY_CODE')}`);
if (env('BADGE_HASH')) await audit('Публічна сторінка бейджа', `${base}/badges/badge.php?hash=${env('BADGE_HASH')}`);

// Сторінки слухача.
if (env('A11Y_USER') && env('COURSE_ID')) {
  await page.goto(`${base}/login/index.php`);
  await page.fill('#username', env('A11Y_USER'));
  await page.fill('#password', env('A11Y_PASS'));
  await page.click('#loginbtn');
  await page.waitForLoadState('networkidle');

  await audit('Сторінка курсу', `${base}/course/view.php?id=${env('COURSE_ID')}`);
  const links = await page.$$eval('a.aalink', (as) => as.map((a) => a.href));
  const pick = (re) => links.find((h) => re.test(h));
  for (const [label, re] of [['Сторінка «Про курс»/відеолекція', /mod\/page\/view/], ['Підсумковий тест', /mod\/quiz\/view/],
    ['Анкета', /mod\/feedback\/view/], ['Сертифікат', /mod\/customcert\/view/]]) {
    const h = pick(re);
    if (h) await audit(label, h);
  }
  await audit('Мої бейджі', `${base}/badges/mybadges.php`);
}

await browser.close();
writeFileSync(env('REPORT') || 'a11y-report.json', JSON.stringify(results, null, 2));
const total = results.reduce((n, r) => n + r.violations.length, 0);
console.log(total ? `\nВсього типів порушень: ${total}` : '\nАвтоматичних порушень WCAG 2.1 A/AA не знайдено.');
process.exit(total ? 1 : 0);
