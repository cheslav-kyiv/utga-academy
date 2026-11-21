import type { ReactNode } from "react";

export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  align = "left",
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <header className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <p className="eyebrow">
        <span aria-hidden="true" className="h-px w-6 bg-current" />
        {eyebrow}
      </p>
      <h2 id={id} className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {lead ? <p className="mt-4 text-lg leading-relaxed text-muted">{lead}</p> : null}
    </header>
  );
}
