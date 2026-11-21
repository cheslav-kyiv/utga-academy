import { participantStatuses, type ParticipantStatus } from "@/data/meetupData";

export interface RegistrationInput {
  fullName: string;
  email: string;
  contact: string;
  city: string;
  status: ParticipantStatus | "";
  question: string;
  consent: boolean;
  /** honeypot: має лишатися порожнім */
  website?: string;
}

export type FieldErrors = Partial<Record<keyof RegistrationInput, string>>;

export const LIMITS = { fullName: 120, email: 254, contact: 64, city: 120, question: 1500 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Телефон (+380…, з пробілами/дужками/дефісами) або Telegram (@username, t.me/username)
const PHONE_RE = /^\+?[\d\s()-]{9,20}$/;
const TELEGRAM_RE = /^(?:@|(?:https?:\/\/)?t\.me\/)[A-Za-z0-9_]{5,32}$/;

export function normalize(raw: Partial<Record<keyof RegistrationInput, unknown>>): RegistrationInput {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const status = str(raw.status);
  return {
    fullName: str(raw.fullName).replace(/\s+/g, " "),
    email: str(raw.email).toLowerCase(),
    contact: str(raw.contact),
    city: str(raw.city).replace(/\s+/g, " "),
    status: (participantStatuses as readonly string[]).includes(status) ? (status as ParticipantStatus) : "",
    question: str(raw.question),
    consent: raw.consent === true || raw.consent === "on" || raw.consent === "true",
    website: str(raw.website),
  };
}

export function validate(input: RegistrationInput): FieldErrors {
  const errors: FieldErrors = {};

  if (input.fullName.length < 3 || !input.fullName.includes(" ")) {
    errors.fullName = "Вкажіть ім'я та прізвище.";
  } else if (input.fullName.length > LIMITS.fullName) {
    errors.fullName = `Не більше ${LIMITS.fullName} символів.`;
  }

  if (!input.email) errors.email = "Вкажіть email — на нього надійде посилання та сертифікат.";
  else if (!EMAIL_RE.test(input.email) || input.email.length > LIMITS.email)
    errors.email = "Перевірте формат email, наприклад: name@example.com.";

  if (!input.contact) errors.contact = "Вкажіть телефон або нікнейм у Telegram.";
  else if (!PHONE_RE.test(input.contact) && !TELEGRAM_RE.test(input.contact))
    errors.contact = "Телефон у форматі +380 XX XXX XX XX або Telegram у форматі @username.";

  if (input.city.length < 2) errors.city = "Вкажіть місто або громаду.";
  else if (input.city.length > LIMITS.city) errors.city = `Не більше ${LIMITS.city} символів.`;

  if (!input.status) errors.status = "Оберіть ваш статус.";

  if (input.question.length > LIMITS.question)
    errors.question = `Не більше ${LIMITS.question} символів.`;

  if (!input.consent) errors.consent = "Потрібна згода на обробку персональних даних.";

  return errors;
}
