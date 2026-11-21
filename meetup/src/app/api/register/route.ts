import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { event } from "@/data/meetupData";
import { normalize, validate } from "@/lib/validation";
import { deliver, hasAnyIntegration, type RegistrationRecord } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Простий ліміт запитів у пам'яті процесу (на один інстанс). Для кількох інстансів — Redis / Upstash. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function confirmationId(): string {
  // Без схожих символів (0/O, 1/I)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `VAG-${code.slice(0, 3)}-${code.slice(3)}`;
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}***@${domain}`;
}

export async function POST(req: NextRequest) {
  if (!event.registrationOpen) {
    return NextResponse.json({ ok: false, message: "Реєстрацію закрито." }, { status: 410 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, message: "Забагато спроб. Спробуйте, будь ласка, за кілька хвилин." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Некоректний формат запиту." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, message: "Некоректний формат запиту." }, { status: 400 });
  }

  const input = normalize(body as Record<string, unknown>);

  // Honeypot: бот заповнив приховане поле — відповідаємо «успіхом», нічого не зберігаючи.
  if (input.website) {
    return NextResponse.json({ ok: true, id: confirmationId() }, { status: 201 });
  }

  const errors = validate(input);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, message: "Перевірте поля форми.", errors }, { status: 422 });
  }

  const { website: _hp, ...data } = input;
  void _hp;
  const record: RegistrationRecord = {
    ...data,
    id: confirmationId(),
    eventSlug: event.slug,
    createdAt: new Date().toISOString(),
    userAgent: req.headers.get("user-agent"),
  };

  const deliveries = await deliver(record);

  // Логи без повних персональних даних
  console.info(
    "[register]",
    JSON.stringify({
      id: record.id,
      event: record.eventSlug,
      email: maskEmail(record.email),
      status: record.status,
      deliveries,
      integrations: hasAnyIntegration() ? "configured" : "none (local file fallback)",
    }),
  );

  // Жоден канал не прийняв заявку — не обманюємо користувача.
  if (deliveries.every((d) => !d.ok)) {
    console.error("[register] delivery failed", JSON.stringify(deliveries));
    return NextResponse.json(
      {
        ok: false,
        message: `Не вдалося зберегти заявку. Спробуйте ще раз або напишіть на ${event.contactEmail}.`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, id: record.id }, { status: 201 });
}

export function GET() {
  return NextResponse.json({ ok: false, message: "Method Not Allowed" }, { status: 405, headers: { Allow: "POST" } });
}
