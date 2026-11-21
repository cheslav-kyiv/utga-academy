import Image from "next/image";
import { Mic, UserRound } from "lucide-react";
import { speakers } from "@/data/meetupData";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function Speakers() {
  const hasPlaceholders = speakers.some((s) => s.placeholder);
  return (
    <section id="speakers" aria-labelledby="speakers-title" className="on-dark bg-ink-900 py-20 text-white sm:py-28">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            id="speakers-title"
            eyebrow="Спікери та експерти"
            title="Практики, історики та фахівці з доступності"
            lead={
              <span className="text-ink-300">
                Правління ГС «ВАГ» і запрошені експерти з інтерпретації спадщини, історії, психології та доступного туризму.
                {hasPlaceholders && " Остаточний склад спікерів оголосимо найближчим часом — зареєстровані учасники дізнаються першими."}
              </span>
            }
          />
        </Reveal>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {speakers.map((s, i) => (
            <Reveal as="li" key={s.id} delay={i * 70}>
              <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-ink-800 p-6">
                <div className="flex items-center gap-4">
                  {s.photo ? (
                    <Image
                      src={s.photo}
                      alt=""
                      width={72}
                      height={72}
                      className="h-18 w-18 rounded-full object-cover ring-2 ring-gold-400/60"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-18 w-18 shrink-0 items-center justify-center rounded-full bg-ink-700 font-display text-xl font-bold text-gold-300 ring-2 ring-gold-400/40"
                    >
                      {s.placeholder ? <UserRound className="h-8 w-8" /> : initials(s.name)}
                    </span>
                  )}
                  <div>
                    <h3 className="text-lg leading-snug font-bold text-white">{s.name}</h3>
                    <p className="mt-1 text-sm text-gold-300">{s.role}</p>
                  </div>
                </div>

                {s.placeholder && (
                  <p className="mt-4 self-start rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-ink-200">
                    Склад уточнюється
                  </p>
                )}

                <ul className="mt-4 space-y-1 text-sm text-ink-300">
                  {s.credentials.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>

                <p className="mt-auto flex items-start gap-2 border-t border-white/10 pt-4 text-[0.95rem] text-white">
                  <Mic aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                  <span>
                    <span className="sr-only">Тема доповіді: </span>
                    {s.talk}
                  </span>
                </p>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
