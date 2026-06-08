import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceRoleClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const managerLeadSchema = z.object({
  buildingName: z.string().trim().min(2).max(160),
  city: z.string().trim().min(1).max(120),
  stateRegion: z.string().trim().max(120).optional().or(z.literal("")),
  managerFirstName: z.string().trim().min(1).max(80).regex(/^[\p{L}\p{M}' -]+$/u, "Invalid first name"),
  managerLastName: z.string().trim().min(1).max(80).regex(/^[\p{L}\p{M}' -]+$/u, "Invalid last name"),
  managerEmail: z.string().trim().email().max(254),
  managerPhone: z.string().trim().min(8).max(20),
  jobTitle: z.string().trim().max(120).optional().or(z.literal("")),
  unitCount: z.number().int().min(1).max(10000),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  contactViaSms: z.boolean().default(false),
  contactViaEmail: z.boolean().default(true),
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

function normalizePhone(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  const normalized = digits.startsWith("+") ? digits : `+${digits}`;
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("Please provide a valid phone number with country code.");
  }

  return normalized;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function makeInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (value) => (value % 36).toString(36)).join("").toUpperCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const rawBody = await req.text();
  if (!rawBody || rawBody.length > 8_192) {
    return jsonResponse(400, { error: "Invalid request" });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "Invalid request" });
  }

  const validation = managerLeadSchema.safeParse(parsedBody);
  if (!validation.success) {
    return jsonResponse(400, { error: "Please review the form details and try again." });
  }

  const normalizedEmail = validation.data.managerEmail.trim().toLowerCase();
  let normalizedPhone = "";

  try {
    normalizedPhone = normalizePhone(validation.data.managerPhone);
  } catch (error) {
    return jsonResponse(400, { error: error instanceof Error ? error.message : "Invalid phone number." });
  }

  const buildingSlug = slugify(`${validation.data.buildingName}-${validation.data.city}`) || `building-${crypto.randomUUID().slice(0, 8)}`;
  const supabase = createServiceRoleClient();
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const requestFingerprint = await sha256(`${getClientIp(req)}|${userAgent}`);
  const emailHash = await sha256(normalizedEmail);
  const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const [{ count: ipAttempts }, { count: emailAttempts }] = await Promise.all([
      supabase
        .from("public_intake_attempts")
        .select("id", { count: "exact", head: true })
        .eq("scope", "building_manager_lead")
        .eq("request_fingerprint", requestFingerprint)
        .gte("created_at", oneHourAgoIso),
      supabase
        .from("public_intake_attempts")
        .select("id", { count: "exact", head: true })
        .eq("scope", "building_manager_lead")
        .eq("email_hash", emailHash)
        .gte("created_at", oneDayAgoIso),
    ]);

    if ((ipAttempts ?? 0) >= 10 || (emailAttempts ?? 0) >= 5) {
      return jsonResponse(429, { error: "Too many requests. Please try again later." });
    }

    const { error: attemptError } = await supabase.from("public_intake_attempts").insert({
      scope: "building_manager_lead",
      request_fingerprint: requestFingerprint,
      email_hash: emailHash,
    });

    if (attemptError) {
      console.error("Failed to store manager lead attempt", attemptError);
      return jsonResponse(500, { error: "Unable to process your request right now." });
    }

    const { data: existingBuilding } = await supabase
      .from("buildings")
      .select("id, name, invite_code")
      .eq("slug", buildingSlug)
      .maybeSingle();

    let buildingId = existingBuilding?.id ?? null;
    let inviteCode = existingBuilding?.invite_code ?? null;

    if (!buildingId) {
      let created = null;
      for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
        const candidateInviteCode = makeInviteCode();
        const insertResult = await supabase
          .from("buildings")
          .insert({
            name: validation.data.buildingName.trim(),
            slug: buildingSlug,
            city: validation.data.city.trim(),
            state_region: validation.data.stateRegion?.trim() || null,
            invite_code: candidateInviteCode,
            is_active: false,
            metadata: {
              source: "residential-beta-manager-page",
              unitCount: validation.data.unitCount,
            },
          })
          .select("id, invite_code")
          .single();

        if (!insertResult.error) {
          created = insertResult.data;
          break;
        }

        if (!String(insertResult.error.message).toLowerCase().includes("duplicate")) {
          console.error("Failed to create building", insertResult.error);
          return jsonResponse(500, { error: "Unable to create the building profile right now." });
        }
      }

      if (!created) {
        return jsonResponse(500, { error: "Unable to create the building profile right now." });
      }

      buildingId = created.id;
      inviteCode = created.invite_code;
    }

    const { error: leadError } = await supabase
      .from("building_manager_leads")
      .upsert({
        building_id: buildingId,
        first_name: validation.data.managerFirstName.trim(),
        last_name: validation.data.managerLastName.trim(),
        email: normalizedEmail,
        normalized_email: normalizedEmail,
        phone_number: normalizedPhone,
        normalized_phone: normalizedPhone,
        job_title: validation.data.jobTitle?.trim() || null,
        unit_count: validation.data.unitCount,
        notes: validation.data.notes?.trim() || null,
        contact_via_sms: validation.data.contactViaSms,
        contact_via_email: validation.data.contactViaEmail,
        source: "residential-beta-manager-page",
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "building_id,normalized_email",
      });

    if (leadError) {
      console.error("Failed to store manager lead", leadError);
      return jsonResponse(500, { error: "Unable to save your request right now." });
    }

    const { error: subscriptionError } = await supabase
      .from("building_subscriptions")
      .upsert({
        building_id: buildingId,
        status: "lead",
        plan_code: "pilot",
        billing_interval: "monthly",
        resident_capacity: validation.data.unitCount,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "building_id",
      });

    if (subscriptionError) {
      console.error("Failed to create subscription lead", subscriptionError);
      return jsonResponse(500, { error: "Unable to save your request right now." });
    }

    return jsonResponse(200, {
      success: true,
      message: "Your building request is in. We'll follow up to finalize the monthly subscription and launch setup.",
      inviteCode,
      buildingSlug,
    });
  } catch (error) {
    console.error("Unexpected manager lead error", error);
    return jsonResponse(500, { error: "Unable to process your request right now." });
  }
});
