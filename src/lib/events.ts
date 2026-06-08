import type { Database } from "@/integrations/supabase/types";

export type AppEvent = Database["public"]["Tables"]["events"]["Row"];
const EVENT_DISPLAY_LOCALE = "en-GB";

export const buildEventPath = (slug?: string | null) => slug ? `/events/${slug}` : "/event";

export const formatEventDateTime = (value?: string | null, timezone?: string | null) => {
  if (!value) return "TBA";

  try {
    return new Intl.DateTimeFormat(EVENT_DISPLAY_LOCALE, {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: timezone || "UTC",
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat(EVENT_DISPLAY_LOCALE, {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(value));
  }
};

export const formatEventDate = (value?: string | null, timezone?: string | null) => {
  if (!value) return "TBA";

  try {
    return new Intl.DateTimeFormat(EVENT_DISPLAY_LOCALE, {
      dateStyle: "medium",
      timeZone: timezone || "UTC",
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat(EVENT_DISPLAY_LOCALE, {
      dateStyle: "medium",
    }).format(new Date(value));
  }
};

export const toDateTimeLocalInput = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export const fromDateTimeLocalInput = (value: string) => {
  if (!value.trim()) return null;
  return new Date(value).toISOString();
};

export const slugifyEventName = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const isEventEnrollmentOpen = (event: Pick<AppEvent, "active" | "enrollment_opens_at" | "enrollment_closes_at" | "start_date">) => {
  if (!event.active) return false;

  const now = Date.now();
  const opensAt = event.enrollment_opens_at ? new Date(event.enrollment_opens_at).getTime() : null;
  // Fall back to start_date if no explicit enrollment close time is set
  const closesAt = event.enrollment_closes_at
    ? new Date(event.enrollment_closes_at).getTime()
    : event.start_date
      ? new Date(event.start_date).getTime()
      : null;

  if (opensAt && now < opensAt) return false;
  if (closesAt && now > closesAt) return false;

  return true;
};
