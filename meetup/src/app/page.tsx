import { event, organisation } from "@/data/meetupData";
import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { Relevance } from "@/components/sections/Relevance";
import { Audience } from "@/components/sections/Audience";
import { Program } from "@/components/sections/Program";
import { Speakers } from "@/components/sections/Speakers";
import { Outcomes } from "@/components/sections/Outcomes";
import { Registration } from "@/components/sections/Registration";
import { Faq } from "@/components/sections/Faq";
import { Footer } from "@/components/sections/Footer";

/** schema.org/Event — для пошукових систем */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: event.title,
  description: event.subtitle,
  startDate: event.startsAt,
  endDate: event.endsAt,
  eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  inLanguage: "uk",
  isAccessibleForFree: true,
  maximumAttendeeCapacity: event.seats,
  location: { "@type": "VirtualLocation", url: organisation.portalUrl },
  organizer: { "@type": "Organization", name: organisation.nameFull, url: organisation.portalUrl },
  offers: { "@type": "Offer", price: 0, priceCurrency: "UAH", availability: "https://schema.org/InStock" },
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Header />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <Hero />
        <Relevance />
        <Audience />
        <Program />
        <Speakers />
        <Outcomes />
        <Registration />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
