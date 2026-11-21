import { ArrowDown, ArrowRight, CalendarDays, Clock } from "lucide-react";
import { event, heroFacts } from "@/data/meetupData";
import { formatEventDate, formatEventTimeRange } from "@/lib/datetime";

export function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="on-dark relative isolate overflow-hidden bg-ink-950 text-white"
    >
      {/* Декоративне тло: топографічні лінії маршруту */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.14]"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 700"
      >
        <defs>
          <radialGradient id="hero-glow" cx="80%" cy="10%" r="70%">
            <stop offset="0" stopColor="#e4b54b" stopOpacity="0.9" />
            <stop offset="1" stopColor="#e4b54b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="700" fill="url(#hero-glow)" opacity="0.35" />
        {Array.from({ length: 9 }).map((_, i) => (
          <path
            key={i}
            d={`M-50 ${520 - i * 48} C 250 ${430 - i * 40}, 420 ${640 - i * 52}, 700 ${500 - i * 44} S 1100 ${360 - i * 30}, 1260 ${420 - i * 40}`}
            fill="none"
            stroke="#d6dce8"
            strokeWidth="1"
          />
        ))}
      </svg>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-1 bg-gradient-to-r from-ua-blue via-ua-blue to-ua-yellow" />

      <div className="container-page pt-14 pb-16 sm:pt-20 sm:pb-24">
        <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-gold-400/40 bg-gold-400/10 px-4 py-2 text-sm font-semibold text-gold-300">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-300 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold-300" />
          </span>
          {event.badge}
        </p>

        <h1 id="hero-title" className="mt-6 max-w-4xl text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          {event.title}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-200 sm:text-xl">{event.offer}</p>

        <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-base text-white">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Дата</dt>
            <CalendarDays aria-hidden="true" className="h-5 w-5 text-gold-300" />
            <dd>
              <time dateTime={event.startsAt}>{formatEventDate()}</time>
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Час</dt>
            <Clock aria-hidden="true" className="h-5 w-5 text-gold-300" />
            <dd>{formatEventTimeRange()}</dd>
          </div>
        </dl>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a href="#register" className="btn-primary text-lg">
            Забронювати місце
            <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </a>
          <a href="#program" className="btn-secondary-dark text-lg">
            Переглянути програму
            <ArrowDown aria-hidden="true" className="h-5 w-5" />
          </a>
        </div>

        <ul aria-label="Ключові параметри події" className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {heroFacts.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
              <Icon aria-hidden="true" className="h-6 w-6 text-gold-300" />
              <p className="mt-3 font-display text-lg font-bold text-white">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-300">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
