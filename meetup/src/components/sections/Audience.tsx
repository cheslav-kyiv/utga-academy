import { audience } from "@/data/meetupData";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Audience() {
  return (
    <section id="audience" aria-labelledby="audience-title" className="bg-paper-100 py-20 sm:py-28">
      <div className="container-page">
        <Reveal>
          <SectionHeading id="audience-title" eyebrow={audience.eyebrow} title={audience.title} />
        </Reveal>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {audience.segments.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 70}>
              <article className="card flex h-full flex-col">
                <Icon aria-hidden="true" className="h-8 w-8 text-ua-blue" />
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{text}</p>
              </article>
            </Reveal>
          ))}
        </ul>
        <Reveal className="mt-10">
          <a href="#register" className="btn-secondary-light">
            Це про мене — зареєструватися
          </a>
        </Reveal>
      </div>
    </section>
  );
}
