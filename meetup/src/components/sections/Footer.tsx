import { ExternalLink, Mail } from "lucide-react";
import { footerLinks, organisation } from "@/data/meetupData";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="on-dark bg-ink-950 text-ink-300">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-relaxed">
            {organisation.nameFull}
            <br />
            <span lang="en">{organisation.nameEn}</span>
          </p>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold tracking-wide text-white uppercase">Реквізити</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="inline">Код ЄДРПОУ: </dt>
              <dd className="inline text-ink-200">{organisation.edrpou}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt>
                <Mail aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">Email</span>
              </dt>
              <dd>
                <a href={`mailto:${organisation.email}`} className="text-ink-200 underline-offset-4 hover:text-white hover:underline">
                  {organisation.email}
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <nav aria-label="Посилання Асоціації">
          <h2 className="font-display text-sm font-bold tracking-wide text-white uppercase">Асоціація</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {footerLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="inline-flex items-center gap-1.5 text-ink-200 underline-offset-4 hover:text-white hover:underline"
                >
                  {l.label}
                  {l.external && (
                    <>
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                      <span className="sr-only"> (відкриється в новій вкладці)</span>
                    </>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-xs">
          © {year} {organisation.nameShort}. Усі права захищено.
        </p>
      </div>
    </footer>
  );
}
