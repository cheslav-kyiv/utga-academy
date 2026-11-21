"use client";

import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, CalendarPlus, CheckCircle2, Download, Loader2, Lock } from "lucide-react";
import { event, participantStatuses, registration } from "@/data/meetupData";
import { formatEventDate, formatEventTimeRange } from "@/lib/datetime";
import { googleCalendarUrl } from "@/lib/calendar";
import { LIMITS, normalize, validate, type FieldErrors, type RegistrationInput } from "@/lib/validation";

type Status = "idle" | "submitting" | "success" | "error";

const EMPTY: RegistrationInput = {
  fullName: "",
  email: "",
  contact: "",
  city: "",
  status: "",
  question: "",
  consent: false,
  website: "",
};

const FIELD_ORDER: (keyof RegistrationInput)[] = ["fullName", "email", "contact", "city", "status", "question", "consent"];
const FIELD_LABELS: Record<string, string> = {
  fullName: "Ім'я та прізвище",
  email: "Email",
  contact: "Телефон / Telegram",
  city: "Місто / громада",
  status: "Статус",
  question: "Питання до спікерів",
  consent: "Згода на обробку даних",
};

export function Registration() {
  const [values, setValues] = useState<RegistrationInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof RegistrationInput, boolean>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverMessage, setServerMessage] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  const set = <K extends keyof RegistrationInput>(key: K, value: RegistrationInput[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    // Після першої взаємодії перевіряємо поле «наживо», щоб помилка зникала одразу після виправлення
    if (touched[key]) setErrors((prev) => ({ ...prev, [key]: validate(normalize(next))[key] }));
  };

  const blur = (key: keyof RegistrationInput) => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: validate(normalize(values))[key] }));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    const data = normalize(values);
    const found = validate(data);
    setErrors(found);
    setTouched(Object.fromEntries(FIELD_ORDER.map((k) => [k, true])));
    if (Object.keys(found).length > 0) {
      setStatus("error");
      setServerMessage("");
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setStatus("submitting");
    setServerMessage("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        message?: string;
        errors?: FieldErrors;
      };
      if (!res.ok || !json.ok) {
        setErrors(json.errors ?? {});
        setServerMessage(json.message ?? "Не вдалося надіслати заявку. Спробуйте ще раз.");
        setStatus("error");
        requestAnimationFrame(() => summaryRef.current?.focus());
        return;
      }
      setConfirmation(json.id ?? null);
      setStatus("success");
      requestAnimationFrame(() => successRef.current?.focus());
    } catch {
      setServerMessage("Немає з'єднання з сервером. Перевірте інтернет і спробуйте ще раз.");
      setStatus("error");
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  const errorList = FIELD_ORDER.filter((k) => errors[k]);
  const describedBy = (key: keyof RegistrationInput, hint?: boolean) =>
    [hint ? `${key}-hint` : null, errors[key] ? `${key}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <section id="register" aria-labelledby="register-title" className="on-dark relative bg-ink-950 py-20 text-white sm:py-28">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ua-blue to-ua-yellow" />
      <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.35fr]">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true" className="h-px w-6 bg-current" />
            {registration.eyebrow}
          </p>
          <h2 id="register-title" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {registration.title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-200">{registration.lead}</p>
          <dl className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <div>
              <dt className="text-sm text-ink-300">Дата</dt>
              <dd className="font-semibold">
                <time dateTime={event.startsAt}>{formatEventDate()}</time>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-300">Час</dt>
              <dd className="font-semibold">{formatEventTimeRange()}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-300">Платформа</dt>
              <dd className="font-semibold">{event.platform}</dd>
            </div>
          </dl>
          <p className="mt-6 flex items-start gap-2 text-sm text-ink-300">
            <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {registration.privacyNote}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 text-text shadow-2xl sm:p-10">
          {status === "success" ? (
            <div className="text-center" role="status">
              <CheckCircle2 aria-hidden="true" className="mx-auto h-14 w-14 text-success" />
              <h3 ref={successRef} tabIndex={-1} className="mt-4 text-2xl font-extrabold">
                Місце заброньовано!
              </h3>
              <p className="mt-3 leading-relaxed text-muted">
                Дякуємо, {values.fullName.split(" ")[0]}. Посилання на підключення надійде на{" "}
                <strong className="text-text">{values.email.trim()}</strong> за добу до події.
              </p>
              {confirmation && (
                <p className="mt-5 inline-block rounded-xl bg-paper-100 px-5 py-3">
                  <span className="block text-sm text-muted">Номер підтвердження</span>
                  <span className="font-display text-xl font-bold tracking-wider tabular-nums">{confirmation}</span>
                </p>
              )}
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href={googleCalendarUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn bg-ink-900 text-white hover:bg-ink-800"
                >
                  <CalendarPlus aria-hidden="true" className="h-5 w-5" />
                  Google Calendar
                  <span className="sr-only"> (відкриється в новій вкладці)</span>
                </a>
                <a href="/api/calendar" download className="btn-secondary-light">
                  <Download aria-hidden="true" className="h-5 w-5" />
                  Файл .ics
                  <span className="sr-only"> для Outlook, Apple Calendar та інших</span>
                </a>
              </div>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} aria-describedby="form-required-note">
              <h3 className="text-xl font-bold">Анкета учасника</h3>
              <p id="form-required-note" className="mt-1 text-sm text-muted">
                Поля, позначені <span aria-hidden="true" className="font-bold text-danger">*</span>
                <span className="sr-only">зірочкою</span>, обов&apos;язкові.
              </p>

              {status === "error" && (errorList.length > 0 || serverMessage) && (
                <div
                  ref={summaryRef}
                  tabIndex={-1}
                  role="alert"
                  aria-labelledby="error-summary-title"
                  className="mt-6 rounded-xl border-2 border-danger bg-[#fdf1f1] p-4"
                >
                  <p id="error-summary-title" className="flex items-center gap-2 font-bold text-danger">
                    <AlertCircle aria-hidden="true" className="h-5 w-5" />
                    {serverMessage || "Будь ласка, виправте помилки у формі:"}
                  </p>
                  {errorList.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-7 text-sm">
                      {errorList.map((k) => (
                        <li key={k}>
                          <a href={`#${k}`} className="text-danger underline underline-offset-2">
                            {FIELD_LABELS[k]}: {errors[k]}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field id="fullName" label="Ім'я та прізвище" required error={errors.fullName} className="sm:col-span-2">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={LIMITS.fullName}
                    value={values.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    onBlur={() => blur("fullName")}
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={describedBy("fullName")}
                    className={inputCls(errors.fullName)}
                  />
                </Field>

                <Field id="email" label="Email" required error={errors.email} hint="Сюди надійде посилання й сертифікат">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    maxLength={LIMITS.email}
                    value={values.email}
                    onChange={(e) => set("email", e.target.value)}
                    onBlur={() => blur("email")}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={describedBy("email", true)}
                    className={inputCls(errors.email)}
                  />
                </Field>

                <Field id="contact" label="Телефон / Telegram" required error={errors.contact} hint="+380… або @username">
                  <input
                    id="contact"
                    name="contact"
                    type="text"
                    autoComplete="tel"
                    required
                    maxLength={LIMITS.contact}
                    value={values.contact}
                    onChange={(e) => set("contact", e.target.value)}
                    onBlur={() => blur("contact")}
                    aria-invalid={Boolean(errors.contact)}
                    aria-describedby={describedBy("contact", true)}
                    className={inputCls(errors.contact)}
                  />
                </Field>

                <Field id="city" label="Місто / громада" required error={errors.city}>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    required
                    maxLength={LIMITS.city}
                    value={values.city}
                    onChange={(e) => set("city", e.target.value)}
                    onBlur={() => blur("city")}
                    aria-invalid={Boolean(errors.city)}
                    aria-describedby={describedBy("city")}
                    className={inputCls(errors.city)}
                  />
                </Field>

                <Field id="status" label="Статус" required error={errors.status}>
                  <select
                    id="status"
                    name="status"
                    required
                    value={values.status}
                    onChange={(e) => set("status", e.target.value as RegistrationInput["status"])}
                    onBlur={() => blur("status")}
                    aria-invalid={Boolean(errors.status)}
                    aria-describedby={describedBy("status")}
                    className={`${inputCls(errors.status)} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%234a5263%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                  >
                    <option value="">Оберіть…</option>
                    {participantStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  id="question"
                  label="Питання до спікерів або ваш кейс"
                  error={errors.question}
                  hint={`Необов'язково. До ${LIMITS.question} символів. Тут же можна вказати потреби щодо доступності.`}
                  className="sm:col-span-2"
                >
                  <textarea
                    id="question"
                    name="question"
                    rows={4}
                    maxLength={LIMITS.question}
                    value={values.question}
                    onChange={(e) => set("question", e.target.value)}
                    onBlur={() => blur("question")}
                    aria-invalid={Boolean(errors.question)}
                    aria-describedby={describedBy("question", true)}
                    className={`${inputCls(errors.question)} resize-y`}
                  />
                </Field>
              </div>

              {/* Honeypot для ботів: прихований від людей і допоміжних технологій */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="website">Не заповнюйте це поле</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={values.website}
                  onChange={(e) => set("website", e.target.value)}
                />
              </div>

              <div className="mt-6">
                <div className="flex items-start gap-3">
                  <input
                    id="consent"
                    name="consent"
                    type="checkbox"
                    required
                    checked={values.consent}
                    onChange={(e) => {
                      setTouched((t) => ({ ...t, consent: true }));
                      set("consent", e.target.checked);
                      setErrors((prev) => ({ ...prev, consent: e.target.checked ? undefined : prev.consent }));
                    }}
                    aria-invalid={Boolean(errors.consent)}
                    aria-describedby={describedBy("consent")}
                    className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-ua-blue"
                  />
                  <label htmlFor="consent" className="text-sm leading-relaxed">
                    Погоджуюся на обробку персональних даних для організації мітапу відповідно до{" "}
                    <a href="/privacy" className="font-semibold text-ua-blue underline underline-offset-2 hover:no-underline">
                      політики конфіденційності
                    </a>
                    <span aria-hidden="true" className="font-bold text-danger">
                      {" "}*
                    </span>
                  </label>
                </div>
                {errors.consent && <ErrorText id="consent-error">{errors.consent}</ErrorText>}
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                aria-disabled={status === "submitting"}
                className="btn-primary mt-8 w-full text-lg disabled:cursor-wait disabled:opacity-80"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
                    Надсилаємо…
                  </>
                ) : (
                  "Забронювати місце"
                )}
              </button>
              <p className="sr-only" role="status" aria-live="polite">
                {status === "submitting" ? "Надсилаємо заявку…" : ""}
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function inputCls(error?: string) {
  return `block min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-base text-text placeholder:text-muted
    focus-visible:border-ua-blue ${error ? "border-2 border-danger" : "border-[#8a92a3]"}`;
}

function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
      <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  className = "",
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block font-semibold">
        {label}
        {required && (
          <span aria-hidden="true" className="font-bold text-danger">
            {" "}*
          </span>
        )}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mb-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {children}
      {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </div>
  );
}
