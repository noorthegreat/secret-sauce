import { supabase } from "@/integrations/supabase/client";

type ErrorContext = Record<string, unknown>;

// Throttle so a render/crash loop can't flood the table.
const MAX_REPORTS_PER_SESSION = 30;
const DEDUPE_WINDOW_MS = 5000;
let reportCount = 0;
const recentlySent = new Map<string, number>();

function persistToSupabase(payload: {
  message: string;
  stack?: string;
  url?: string;
  context?: ErrorContext;
}): void {
  if (reportCount >= MAX_REPORTS_PER_SESSION) return;
  const key = payload.message || "unknown";
  const now = Date.now();
  const last = recentlySent.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) return; // skip duplicates in a burst
  recentlySent.set(key, now);
  reportCount++;

  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      // `client_error_logs` isn't in the generated types yet — cast like other
      // not-yet-typed tables in this codebase.
      await supabase.from("client_error_logs" as never).insert({
        message: payload.message?.slice(0, 2000) ?? null,
        stack: payload.stack?.slice(0, 8000) ?? null,
        url: payload.url ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        user_id: data.session?.user?.id ?? null,
        context: payload.context ?? null,
      } as never);
    } catch {
      // Error reporting must never cause more errors.
    }
  })();
}

/**
 * Central client-error reporting hook. Logs to the console, persists to the
 * `client_error_logs` Supabase table (viewable in Admin → Error Logs), and
 * forwards to Sentry if a global `Sentry` is present. Never log secrets/PII
 * beyond message/stack/url/context (per CLAUDE.md).
 */
export function reportClientError(error: unknown, context?: ErrorContext): void {
  try {
    const payload = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      context,
    };
    console.error("[clientError]", payload);
    persistToSupabase(payload);

    const sentry = (globalThis as unknown as { Sentry?: { captureException?: (e: unknown, o?: unknown) => void } }).Sentry;
    if (sentry?.captureException) sentry.captureException(error, { extra: context });
  } catch {
    // Error reporting must never throw.
  }
}

let installed = false;

/** Capture otherwise-unhandled errors and promise rejections. Idempotent. */
export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => reportClientError(e.error ?? e.message, { type: "window.error" }));
  window.addEventListener("unhandledrejection", (e) =>
    reportClientError((e as PromiseRejectionEvent).reason, { type: "unhandledrejection" }),
  );
}
