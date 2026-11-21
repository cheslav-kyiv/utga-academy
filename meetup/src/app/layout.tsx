import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "./globals.css";
import { event, organisation } from "@/data/meetupData";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: `${event.title} — онлайн-мітап ${organisation.nameShort}`,
  description: event.subtitle,
  openGraph: {
    type: "website",
    locale: "uk_UA",
    title: event.title,
    description: event.subtitle,
    siteName: organisation.nameFull,
  },
  icons: { icon: "/emblem.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0b111c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        {/* Позначка JS до гідратації: без JS блоки видимі одразу (прогресивне покращення) */}
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-ink-950"
        >
          Перейти до основного змісту
        </a>
        {children}
      </body>
    </html>
  );
}
