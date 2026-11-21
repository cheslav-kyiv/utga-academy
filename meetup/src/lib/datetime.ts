import { event } from "@/data/meetupData";

const TZ = "Europe/Kyiv";

/** «10 грудня 2026, четвер» */
export function formatEventDate(iso: string = event.startsAt): string {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
    timeZone: TZ,
  }).format(new Date(iso));
}

/** «18:00» */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

/** «18:00–20:30 за Києвом» */
export function formatEventTimeRange(): string {
  return `${formatTime(event.startsAt)}–${formatTime(event.endsAt)} ${event.timezoneLabel}`;
}
