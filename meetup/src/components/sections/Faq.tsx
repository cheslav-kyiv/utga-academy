"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { faq, organisation } from "@/data/meetupData";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Faq() {
  const baseId = useId();
  const [open, setOpen] = useState<string | null>(faq[0]?.id ?? null);

  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-paper-100 py-20 sm:py-28">
      <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <SectionHeading id="faq-title" eyebrow="Питання (FAQ)" title="Часті запитання" />
          <p className="mt-4 leading-relaxed text-muted">
            Не знайшли відповіді? Напишіть нам:{" "}
            <a href={`mailto:${organisation.email}`} className="font-semibold text-ua-blue underline underline-offset-4 hover:no-underline">
              {organisation.email}
            </a>
          </p>
        </div>
        <div className="divide-y divide-paper-200 rounded-2xl border border-paper-200 bg-white">
          {faq.map((item) => {
            const isOpen = open === item.id;
            const btnId = `${baseId}-${item.id}-q`;
            const panelId = `${baseId}-${item.id}-a`;
            return (
              <div key={item.id}>
                <h3>
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : item.id)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left text-lg font-semibold hover:bg-paper-50"
                  >
                    {item.question}
                    <Plus
                      aria-hidden="true"
                      className={`h-5 w-5 shrink-0 text-ochre-700 transition-transform ${isOpen ? "rotate-45" : ""}`}
                    />
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={btnId} hidden={!isOpen} className="px-5 pb-5">
                  <p className="leading-relaxed text-muted">{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
