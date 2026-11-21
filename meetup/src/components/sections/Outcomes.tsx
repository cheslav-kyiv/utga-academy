import { CheckCircle2 } from "lucide-react";
import { outcomes } from "@/data/meetupData";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Outcomes() {
  return (
    <section id="outcomes" aria-labelledby="outcomes-title" className="bg-paper-50 py-20 sm:py-28">
      <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <Reveal className="lg:sticky lg:top-28">
          <SectionHeading id="outcomes-title" eyebrow={outcomes.eyebrow} title={outcomes.title} />
          <a href="#register" className="btn-primary mt-8">
            Отримати інструменти
          </a>
        </Reveal>
        <ul className="space-y-4">
          {outcomes.items.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 70}>
              <article className="card flex items-start gap-4">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-success" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-1 leading-relaxed text-muted">{text}</p>
                </div>
                <Icon aria-hidden="true" className="hidden h-8 w-8 shrink-0 text-ochre-700 sm:block" />
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
