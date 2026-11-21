"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { program, speakers, type ProgramTag } from "@/data/meetupData";
import { formatEventDate } from "@/lib/datetime";
import { SectionHeading } from "@/components/ui/SectionHeading";

const TAG_STYLES: Record<ProgramTag, string> = {
  Вступ: "bg-ink-200 text-ink-900",
  Методологія: "bg-[#dbe8f8] text-[#0b3f80]",
  "Етика та психологія": "bg-[#f6e0dc] text-[#7d2416]",
  "Безпека та доступність": "bg-[#dcefe2] text-[#1b5a32]",
  "Кейс-стаді": "bg-[#f6ebcd] text-ochre-800",
  "Q&A-сесія": "bg-[#e6e0f3] text-[#47307c]",
};

const speakerName = (id: string) => speakers.find((s) => s.id === id)?.name ?? "";

export function Program() {
  const baseId = useId();
  const allTags = useMemo(
    () => Array.from(new Set(program.flatMap((p) => p.tags))) as ProgramTag[],
    [],
  );
  const [filter, setFilter] = useState<ProgramTag | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set([program[1]?.id].filter(Boolean)));

  const visible = filter ? program.filter((p) => p.tags.includes(filter)) : program;
  const allOpen = visible.every((p) => openIds.has(p.id));

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section id="program" aria-labelledby="program-title" className="bg-paper-50 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          id="program-title"
          eyebrow="Програма мітапу"
          title="2,5 години концентрованої практики"
          lead={`${formatEventDate()}. Час — за Києвом. Розгорніть виступ, щоб побачити тези.`}
        />

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div role="group" aria-label="Фільтр за темою" className="flex flex-wrap gap-2">
            <FilterButton active={filter === null} onClick={() => setFilter(null)}>
              Усі теми
            </FilterButton>
            {allTags.map((tag) => (
              <FilterButton key={tag} active={filter === tag} onClick={() => setFilter(tag)}>
                {tag}
              </FilterButton>
            ))}
          </div>
          <button
            type="button"
            className="self-start text-sm font-semibold text-ua-blue underline underline-offset-4 hover:no-underline sm:self-auto"
            onClick={() =>
              setOpenIds((prev) => {
                const next = new Set(prev);
                visible.forEach((p) => (allOpen ? next.delete(p.id) : next.add(p.id)));
                return next;
              })
            }
          >
            {allOpen ? "Згорнути всі" : "Розгорнути всі"}
          </button>
        </div>

        <p className="sr-only" aria-live="polite">
          {filter ? `Показано виступів: ${visible.length} з темою «${filter}»` : `Показано всі виступи: ${visible.length}`}
        </p>

        <ol className="relative mt-8 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[1.1rem] before:w-px before:bg-paper-200 sm:before:left-[5.6rem]">
          {visible.map((item) => {
            const isOpen = openIds.has(item.id);
            const panelId = `${baseId}-${item.id}-panel`;
            const btnId = `${baseId}-${item.id}-btn`;
            return (
              <li key={item.id} className="relative grid grid-cols-[2.25rem_1fr] gap-3 sm:grid-cols-[5rem_1.25rem_1fr] sm:gap-4">
                <p className="hidden pt-5 text-right font-display text-lg font-bold tabular-nums text-text sm:block">
                  <time>{item.start}</time>
                </p>
                <span aria-hidden="true" className="relative z-10 mt-6 ml-2.5 h-3.5 w-3.5 rounded-full border-[3px] border-paper-50 bg-gold-500 ring-1 ring-gold-500 sm:ml-0" />
                <article className="card p-0">
                  <h3 className="text-lg font-bold">
                    <button
                      id={btnId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggle(item.id)}
                      className="flex w-full items-start justify-between gap-4 rounded-2xl p-5 text-left hover:bg-paper-100/60"
                    >
                      <span>
                        <span className="mb-1 block font-display text-sm font-semibold text-muted tabular-nums">
                          <span className="sr-only">Час: </span>
                          {item.start}–{item.end}
                        </span>
                        {item.title}
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={`mt-1 h-5 w-5 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </h3>
                  <div className="flex flex-wrap gap-2 px-5 pb-4">
                    <span className="sr-only">Теми:</span>
                    {item.tags.map((t) => (
                      <span key={t} className={`tag ${TAG_STYLES[t]}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div id={panelId} role="region" aria-labelledby={btnId} hidden={!isOpen} className="border-t border-paper-200 px-5 py-4">
                    <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-muted marker:text-gold-500">
                      {item.theses.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                    {item.speakerIds.length > 0 && (
                      <p className="mt-3 text-sm text-text">
                        <span className="font-semibold">Спікери: </span>
                        {item.speakerIds.map(speakerName).join(", ")}
                      </p>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
        active ? "border-ink-900 bg-ink-900 text-white" : "border-paper-200 bg-white text-text hover:border-ink-700"
      }`}
    >
      {children}
    </button>
  );
}
