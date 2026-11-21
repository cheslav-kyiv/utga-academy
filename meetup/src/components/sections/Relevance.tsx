import { relevance } from "@/data/meetupData";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Relevance() {
  return (
    <section id="about" aria-labelledby="about-title" className="bg-paper-50 py-20 sm:py-28">
      <div className="container-page">
        <Reveal>
          <SectionHeading id="about-title" eyebrow={relevance.eyebrow} title={relevance.title} lead={relevance.lead} />
        </Reveal>
        <ul className="mt-12 grid gap-5 md:grid-cols-2">
          {relevance.cards.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 80}>
              <article className="card group relative h-full overflow-hidden">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-gold-400 transition-all group-hover:w-1.5" />
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-gold-300">
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold">{title}</h3>
                    <p className="mt-2 leading-relaxed text-muted">{text}</p>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
