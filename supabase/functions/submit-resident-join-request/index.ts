import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceRoleClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const residentJoinSchema = z.object({
  inviteCode: z.string().trim().min(5).max(16).regex(/^[A-Z0-9-]+$/, "Invalid invite code"),
  firstName: z.string().trim().min(1).max(80).regex(/^[\p{L}\p{M}' -]+$/u, "Invalid first name"),
  lastName: z.string().trim().min(1).max(80).regex(/^[\p{L}\p{M}' -]+$/u, "Invalid last name"),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(20),
  unitNumber: z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9 -]+$/, "Invalid unit number"),
  moveInDate: z.string().trim().optional().or(z.literal("")),
  wantsFriendships: z.boolean().default(true),
  wantsNetworking: z.boolean().default(true),
  contactViaSms: z.boolean().default(true),
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

  const validation = residentJoinSchema.safeParse(parsedBody);
  if (!validation.success) {
    return jsonResponse(400, { error: "Please review the form details and try again." });
  }

  if (!validation.data.wantsFriendships && !validation.data.wantsNetworking) {
    return jsonResponse(400, { error: "Choose at least one connection goal." });
  }

  const normalizedInviteCode = validation.data.inviteCode.trim().toUpperCase();
  const normalizedEmail = validation.data.email.trim().toLowerCase();
  let normalizedPhone = "";

  try {
    normalizedPhone = normalizePhone(validation.data.phone);
  } catch (error) {
    return jsonResponse(400, { error: error instanceof Error ? error.message : "Invalid phone number." });
  }

  const moveInDate = validation.data.moveInDate?.trim()
    ? new Date(validation.data.moveInDate)
    : null;

  if (moveInDate && Number.isNaN(moveInDate.getTime())) {
    return jsonResponse(400, { error: "Please provide a valid move-in date." });
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
        .from("public_intake_attempts")
        .select("id", { count: "exact", head: true })
        .eq("scope", "resident_join_request")
        .eq("request_fingerprint", requestFingerprint)
        .gte("created_at", oneHourAgoIso),
      supabase
        .from("public_intake_attempts")
        .select("id", { count: "exact", head: true })
        .eq("scope", "resident_join_request")
        .eq("email_hash", emailHash)
        .gte("created_at", oneDayAgoIso),
    ]);

    if ((ipAttempts ?? 0) >= 10 || (emailAttempts ?? 0) >= 5) {
      return jsonResponse(429, { error: "Too many requests. Please try again later." });
    }

    const { error: attemptError } = await supabase.from("public_intake_attempts").insert({
      scope: "resident_join_request",
      request_fingerprint: requestFingerprint,
      email_hash: emailHash,
    });

    if (attemptError) {
      console.error("Failed to store resident join attempt", attemptError);
      return jsonResponse(500, { error: "Unable to process your request right now." });
    }

    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("id, name, is_active")
      .eq("invite_code", normalizedInviteCode)
      .maybeSingle();

    if (buildingError) {
      console.error("Failed to look up building", buildingError);
      return jsonResponse(500, { error: "Unable to verify your building right now." });
    }

    if (!building) {
      return jsonResponse(404, { error: "We couldn't find a building with that invite code." });
    }

    const { error: requestError } = await supabase
      .from("resident_join_requests")
      .upsert({
        building_id: building.id,
        first_name: validation.data.firstName.trim(),
        last_name: validation.data.lastName.trim(),
        email: normalizedEmail,
        normalized_email: normalizedEmail,
        phone_number: normalizedPhone,
        normalized_phone: normalizedPhone,
        unit_number: validation.data.unitNumber.trim().toUpperCase(),
        move_in_date: moveInDate ? moveInDate.toISOString().slice(0, 10) : null,
        status: "pending_review",
        wants_friendships: validation.data.wantsFriendships,
        wants_networking: validation.data.wantsNetworking,
        contact_via_sms: validation.data.contactViaSms,
        contact_via_email: validation.data.contactViaEmail,
        source: "residential-beta-resident-page",
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "building_id,normalized_email",
      });

    if (requestError) {
      console.error("Failed to save resident join request", requestError);
      return jsonResponse(500, { error: "Unable to save your request right now." });
    }

    return jsonResponse(200, {
      success: true,
      message: building.is_active
        ? `You're on the list for ${building.name}. We'll text or email you with next steps.`
        : `${building.name} is getting set up. We've saved your details and will reach out when the community opens.`,
      buildingName: building.name,
    });
  } catch (error) {
    console.error("Unexpected resident join error", error);
    return jsonResponse(500, { error: "Unable to process your request right now." });
  }
});
