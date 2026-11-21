import { organisation } from "@/data/meetupData";

/**
 * Емблема-плейсхолдер (абстрактна: маршрут + орієнтир у колі).
 * TODO: замінити на офіційний логотип ГС «ВАГ» (SVG) — компонент Emblem.
 * Державний Герб навмисно не використовується.
 */
export function Emblem({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="22.5" fill="#101827" stroke="#e4b54b" strokeWidth="2" />
      <path
        d="M11 33c4-1 6-5 9-9s6-6 9-5 4 4 8 2"
        fill="none"
        stroke="#f0cf7a"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="0.5 4.2"
      />
      <path d="M33 10l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" fill="#e4b54b" />
      <circle cx="11" cy="33" r="2.6" fill="#ffd500" />
      <path d="M8 38h32" stroke="#0057b7" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const isDark = tone === "dark";
  return (
    <span className="flex items-center gap-3">
      <Emblem />
      <span className="flex flex-col leading-tight">
        <span className={`font-display text-base font-extrabold ${isDark ? "text-white" : "text-text"}`}>
          {organisation.nameShort}
        </span>
        <span className={`hidden text-xs sm:block ${isDark ? "text-ink-300" : "text-muted"}`}>
          Всеукраїнська асоціація гідів
        </span>
      </span>
    </span>
  );
}
