import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { event } from "@/data/meetupData";
import type { RegistrationInput } from "@/lib/validation";

export interface RegistrationRecord extends Omit<RegistrationInput, "website"> {
  id: string;
  eventSlug: string;
  createdAt: string;
  userAgent: string | null;
}

export interface DeliveryResult {
  channel: "webhook" | "telegram" | "file";
  ok: boolean;
  detail?: string;
}

const TIMEOUT_MS = 8000;

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/** Загальний вебхук: Make / n8n / Zapier / Google Apps Script (→ Google Sheets) */
async function sendWebhook(record: RegistrationRecord): Promise<DeliveryResult | null> {
  const url = process.env.REGISTRATION_WEBHOOK_URL;
  if (!url) return null;
  const secret = process.env.REGISTRATION_WEBHOOK_SECRET;
  try {
    await post(url, { type: "meetup.registration", event: event.slug, data: record }, secret ? { "X-Webhook-Secret": secret } : {});
    return { channel: "webhook", ok: true };
  } catch (e) {
    return { channel: "webhook", ok: false, detail: (e as Error).message };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Сповіщення організаторам у Telegram */
async function sendTelegram(record: RegistrationRecord): Promise<DeliveryResult | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  const text = [
    `<b>Нова реєстрація</b> · ${escapeHtml(event.title)}`,
    `№ <code>${record.id}</code>`,
    `👤 ${escapeHtml(record.fullName)}`,
    `✉️ ${escapeHtml(record.email)}`,
    `📞 ${escapeHtml(record.contact)}`,
    `📍 ${escapeHtml(record.city)}`,
    `🏷 ${escapeHtml(record.status)}`,
    record.question ? `❓ ${escapeHtml(record.question)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  try {
    await post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    return { channel: "telegram", ok: true };
  } catch (e) {
    return { channel: "telegram", ok: false, detail: (e as Error).message };
  }
}

/**
 * Резервне сховище, коли жодну інтеграцію не налаштовано: JSONL у .data/ (у .gitignore).
 * Працює локально і на власному сервері (node). На serverless-хостингу (Vercel)
 * файлова система лише для читання — там обов'язково налаштуйте вебхук або Telegram.
 */
async function saveToFile(record: RegistrationRecord): Promise<DeliveryResult> {
  try {
    const dir = path.join(process.cwd(), ".data");
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, "registrations.jsonl"), JSON.stringify(record) + "\n", "utf8");
    return { channel: "file", ok: true };
  } catch (e) {
    return { channel: "file", ok: false, detail: (e as Error).message };
  }
}

export async function deliver(record: RegistrationRecord): Promise<DeliveryResult[]> {
  if (!hasAnyIntegration()) return [await saveToFile(record)];
  const results = await Promise.all([sendWebhook(record), sendTelegram(record)]);
  return results.filter((r): r is DeliveryResult => r !== null);
}

export function hasAnyIntegration(): boolean {
  return Boolean(process.env.REGISTRATION_WEBHOOK_URL || (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID));
}
