import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceRoleClient } from "../_shared/auth.ts";
import { SWISS_INSTITUTION_INDEX } from "../_shared/swissInstitutions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const waitlistSchema = z.object({
  firstName: z.string().trim().min(1).max(80).regex(/^[\p{L}\p{M}' -]+$/u, "Invalid name"),
  email: z.string().trim().email().max(254),
  city: z.string().trim().min(1).max(120),
  institutionId: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "Invalid institution"),
  consentToUpdates: z.boolean().default(false),
});

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return req.headers.get("x-real-ip")
    ?? req.headers.get("cf-connecting-ip")
    ?? "unknown";
}

function emailMatchesInstitution(email: string, allowedDomains: string[]) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return allowedDomains.some((allowedDomain) => {
    const normalizedDomain = allowedDomain.toLowerCase();
    return domain === normalizedDomain || domain.endsWith(`.${normalizedDomain}`);
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const rawBody = await req.text();
  if (!rawBody || rawBody.length > 4_096) {
    return jsonResponse(400, { error: "Invalid request" });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "Invalid request" });
  }

  const validation = waitlistSchema.safeParse(parsedBody);
  if (!validation.success) {
    return jsonResponse(400, { error: "Please review the highlighted fields and try again." });
  }

  const normalizedEmail = validation.data.email.trim().toLowerCase();
  const normalizedCity = validation.data.city.trim();
  const institution = SWISS_INSTITUTION_INDEX[validation.data.institutionId];

  if (!institution || institution.city !== normalizedCity) {
    return jsonResponse(400, { error: "Please choose a valid city and institution." });
  }

  if (!emailMatchesInstitution(normalizedEmail, institution.emailDomains)) {
    return jsonResponse(400, {
      error: `Please use your ${institution.name} school email to join this waitlist.`,
    });
  }

  const supabase = createServiceRoleClient();
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const requestFingerprint = await sha256(`${getClientIp(req)}|${userAgent}`);
  const emailHash = await sha256(normalizedEmail);
  const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const [{ count: ipAttempts }, { count: emailAttempts }] = await Promise.all([
      supabase
        .from("swiss_waitlist_attempts")
        .select("id", { count: "exact", head: true })
        .eq("request_fingerprint", requestFingerprint)
        .gte("created_at", oneHourAgoIso),
      supabase
        .from("swiss_waitlist_attempts")
        .select("id", { count: "exact", head: true })
        .eq("email_hash", emailHash)
        .gte("created_at", oneDayAgoIso),
    ]);

    if ((ipAttempts ?? 0) >= 10 || (emailAttempts ?? 0) >= 5) {
      return jsonResponse(429, {
        error: "Too many requests. Please wait a bit and try again.",
      });
    }

    const { error: attemptError } = await supabase
      .from("swiss_waitlist_attempts")
      .insert({
        request_fingerprint: requestFingerprint,
        email_hash: emailHash,
      });

    if (attemptError) {
      console.error("Failed to store waitlist attempt", attemptError);
      return jsonResponse(500, { error: "Unable to process your request right now." });
    }

    const { error: upsertError } = await supabase
      .from("swiss_waitlist_entries")
      .upsert({
        first_name: validation.data.firstName.trim(),
        email: normalizedEmail,
        normalized_email: normalizedEmail,
        city: normalizedCity,
        institution_id: institution.id,
        institution_name: institution.name,
        institution_type: institution.type,
        consent_to_updates: validation.data.consentToUpdates,
        source: "switzerland-launch-page",
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "normalized_email,institution_id",
      });

    if (upsertError) {
      console.error("Failed to upsert waitlist entry", upsertError);
      return jsonResponse(500, { error: "Unable to join the waitlist right now." });
    }

    return jsonResponse(200, {
      success: true,
      message: "You're on the waitlist.",
    });
  } catch (error) {
    console.error("Unexpected waitlist error", error);
    return jsonResponse(500, { error: "Unable to process your request right now." });
  }
});
