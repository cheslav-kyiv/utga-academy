import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { organisation } from "@/data/meetupData";

export const metadata: Metadata = { title: `Політика конфіденційності — ${organisation.nameShort}` };

/**
 * TODO: ЧЕРНЕТКА. Текст має затвердити Правління ГС «ВАГ» (відповідно до Закону України
 * «Про захист персональних даних»; для учасників з ЄС — також GDPR).
 */
export default function PrivacyPage() {
  return (
    <main id="main" className="container-page max-w-3xl py-16">
      <Link href="/" className="inline-flex items-center gap-2 font-semibold text-ua-blue underline underline-offset-4 hover:no-underline">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> На сторінку мітапу
      </Link>
      <h1 className="mt-8 text-3xl font-extrabold sm:text-4xl">Політика конфіденційності</h1>
      <p className="mt-2 text-sm text-muted">Редакція-чернетка; потребує затвердження {organisation.nameShort}.</p>

      <div className="mt-8 space-y-6 leading-relaxed">
        <section aria-labelledby="p-controller">
          <h2 id="p-controller" className="text-xl font-bold">Хто обробляє дані</h2>
          <p className="mt-2">
            {organisation.nameFull} (код ЄДРПОУ {organisation.edrpou}), контакт:{" "}
            <a className="text-ua-blue underline" href={`mailto:${organisation.email}`}>{organisation.email}</a>.
          </p>
        </section>
        <section aria-labelledby="p-data">
          <h2 id="p-data" className="text-xl font-bold">Які дані і навіщо</h2>
          <p className="mt-2">
            Ім&apos;я та прізвище, email, телефон або Telegram, місто/громада, статус учасника і (за бажанням) питання до спікерів —
            лише для реєстрації на мітап, надсилання посилання на підключення, матеріалів і сертифіката участі.
          </p>
        </section>
        <section aria-labelledby="p-retention">
          <h2 id="p-retention" className="text-xl font-bold">Строк зберігання та передача</h2>
          <p className="mt-2">
            Дані не передаються третім особам для маркетингу. Строк зберігання та перелік технічних обробників
            (сервіс розсилки, платформа трансляції) визначає {organisation.nameShort}.
          </p>
        </section>
        <section aria-labelledby="p-rights">
          <h2 id="p-rights" className="text-xl font-bold">Ваші права</h2>
          <p className="mt-2">
            Ви можете запросити доступ до своїх даних, їх виправлення або видалення, а також відкликати згоду, написавши на{" "}
            <a className="text-ua-blue underline" href={`mailto:${organisation.email}`}>{organisation.email}</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
