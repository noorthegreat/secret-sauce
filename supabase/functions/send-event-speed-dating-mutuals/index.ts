/**
 * Send mutual speed-dating contact emails to enrolled participants.
 *
 * Uses send-user-emails (blank_announcement) so styling matches other Orbiit mail.
 * Optional offlineParticipants: walk-ins not in event_enrollments (email required; phone optional).
 *
 * Auth: X-Cron-Secret, Supabase service role, or JWT for a user with admin role.
 *
 * Body JSON:
 * - eventId (uuid, required)
 * - pairs OR pairsByName (required, one of)
 * - offlineParticipants (optional): [{ firstName, email, phone? }] — matched by normalized first name
 * - disambiguate (optional): [{ firstName, userId }] — when several enrolled users share a first name (e.g. two Olivers)
 * - emailSubject, eventName, dryRun
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { authenticateEdgeRequest } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const OFFLINE_PREFIX = "offline:";

function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type OfflineParticipant = {
  firstName: string;
  email: string;
  phone?: string | null;
};

type OfflineByNorm = Map<string, OfflineParticipant>;

function offlineKey(norm: string): string {
  return `${OFFLINE_PREFIX}${norm}`;
}

function isOfflineId(id: string): boolean {
  return id.startsWith(OFFLINE_PREFIX);
}

function parseOfflineId(id: string): string | null {
  if (!isOfflineId(id)) return null;
  return id.slice(OFFLINE_PREFIX.length);
}

async function loadBlankAnnouncementTemplate(): Promise<string> {
  const path = new URL("../send-user-emails/_templates/blank-announcement.html", import.meta.url);
  return await Deno.readTextFile(path);
}

function fillBlankTemplate(
  template: string,
  firstName: string,
  subjectHeader: string,
  content: string,
): string {
  const year = new Date().getFullYear().toString();
  return template
    .replaceAll("{{firstName}}", escapeHtml(firstName))
    .replaceAll("{{subjectHeader}}", escapeHtml(subjectHeader))
    .replaceAll("{{content}}", content)
    .replaceAll("{{year}}", year);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await authenticateEdgeRequest(req, {
    allowCronSecret: true,
    allowServiceRole: true,
  });

  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error.message }), {
      status: auth.error.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ctx = auth.context!;
  const isPrivileged = ctx.isInternal || ctx.isAdmin;

  if (!isPrivileged) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = ctx.supabase;

  let body: {
    eventId?: string;
    eventName?: string;
    emailSubject?: string;
    dryRun?: boolean;
    pairs?: Array<{ userAId: string; userBId: string }>;
    pairsByName?: Array<{ a: string; b: string }>;
    offlineParticipants?: OfflineParticipant[];
    disambiguate?: Array<{ firstName: string; userId: string }>;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventId = body.eventId?.trim();
  if (!eventId) {
    return new Response(JSON.stringify({ error: "eventId is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const offlineByNorm: OfflineByNorm = new Map();
  for (const o of body.offlineParticipants || []) {
    const fn = (o.firstName || "").trim();
    const em = (o.email || "").trim();
    if (!fn || !em) {
      return new Response(
        JSON.stringify({ error: "Each offline participant needs firstName and email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const n = normalizeName(fn);
    if (offlineByNorm.has(n)) {
      return new Response(
        JSON.stringify({ error: `Duplicate offline first name: ${fn}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    offlineByNorm.set(n, { firstName: fn, email: em, phone: o.phone ?? null });
  }

  const hasPairs = Array.isArray(body.pairs) && body.pairs.length > 0;
  const hasNamePairs = Array.isArray(body.pairsByName) && body.pairsByName.length > 0;
  if (hasPairs === hasNamePairs) {
    return new Response(
      JSON.stringify({ error: "Provide exactly one of: pairs, pairsByName" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: eventRow, error: eventErr } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .maybeSingle();

  if (eventErr || !eventRow) {
    return new Response(JSON.stringify({ error: "Event not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: enrollRows, error: enrErr } = await supabase
    .from("event_enrollments")
    .select("user_id")
    .eq("event_id", eventId);

  if (enrErr) {
    console.error(enrErr);
    return new Response(JSON.stringify({ error: "Failed to load enrollments" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const enrolled = new Set((enrollRows || []).map((r: { user_id: string }) => r.user_id));

  const { data: profileRows, error: prErr } = await supabase
    .from("profiles")
    .select("id, first_name")
    .in("id", [...enrolled]);

  if (prErr) {
    return new Response(JSON.stringify({ error: "Failed to load profiles for event" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const byNorm = new Map<string, string[]>();
  for (const pr of profileRows as { id: string; first_name: string }[]) {
    const key = normalizeName(pr.first_name || "");
    if (!key) continue;
    const arr = byNorm.get(key) || [];
    arr.push(pr.id);
    byNorm.set(key, arr);
  }

  const disambiguateByNorm = new Map<string, string>();
  for (const d of body.disambiguate || []) {
    const n = normalizeName(d.firstName || "");
    const uid = d.userId?.trim();
    if (!n || !uid) {
      return new Response(
        JSON.stringify({ error: "disambiguate entries need firstName and userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (disambiguateByNorm.has(n)) {
      return new Response(
        JSON.stringify({ error: `Duplicate disambiguate first name: ${d.firstName}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    disambiguateByNorm.set(n, uid);
  }

  const profileById = new Map(
    (profileRows as { id: string; first_name: string }[]).map((p) => [p.id, p]),
  );

  type NameResolveFail = { ok: false; error: string; candidateUserIds?: string[] };
  type NameResolveOk = { ok: true; id: string };

  function resolveNameToId(raw: string): NameResolveOk | NameResolveFail {
    const na = normalizeName(raw || "");
    if (!na) return { ok: false, error: "Empty name" };
    const enrolledIds = byNorm.get(na);
    if (enrolledIds?.length === 1) return { ok: true, id: enrolledIds[0] };
    if (enrolledIds && enrolledIds.length > 1) {
      const forced = disambiguateByNorm.get(na);
      if (forced && enrolledIds.includes(forced)) {
        return { ok: true, id: forced };
      }
      if (forced && !enrolledIds.includes(forced)) {
        const pr = profileById.get(forced);
        const inEvent = enrolled.has(forced);
        if (pr && inEvent) {
          return {
            ok: false,
            error:
              `disambiguate userId ${forced} is enrolled in this event, but their profile first name is "${pr.first_name}" (normalized "${normalizeName(pr.first_name)}"), not "${raw.trim()}". ` +
                `For "${raw.trim()}" you must pick one of candidateUserIds (same first name in DB).`,
            candidateUserIds: [...enrolledIds],
          };
        }
        return {
          ok: false,
          error:
            `disambiguate userId ${forced} is not among the enrolled users named "${raw.trim()}". ` +
              `Use one of candidateUserIds.`,
          candidateUserIds: [...enrolledIds],
        };
      }
      return {
        ok: false,
        error:
          `Ambiguous first name (multiple enrolled): "${raw.trim()}". Add disambiguate: [{ "firstName": "${raw.trim()}", "userId": "<their uuid>" }]`,
        candidateUserIds: [...enrolledIds],
      };
    }
    const off = offlineByNorm.get(na);
    if (off) return { ok: true, id: offlineKey(na) };
    return {
      ok: false,
      error: `Not enrolled in event and not in offlineParticipants: "${raw.trim()}"`,
    };
  }

  function resolvePairId(raw: string): {
    ok: true;
    id: string;
  } | {
    ok: false;
    message: string;
    candidateUserIds?: string[];
  } {
    const t = raw.trim();
    if (isOfflineId(t)) {
      const norm = parseOfflineId(t);
      if (!norm || !offlineByNorm.has(norm)) {
        return { ok: false, message: `Unknown offline id: ${t}` };
      }
      return { ok: true, id: offlineKey(norm) };
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) {
      if (!enrolled.has(t)) {
        return { ok: false, message: `User not enrolled in event: ${t}` };
      }
      return { ok: true, id: t };
    }
    const r = resolveNameToId(t);
    if (!r.ok) {
      return { ok: false, message: r.error, candidateUserIds: r.candidateUserIds };
    }
    return { ok: true, id: r.id };
  }

  type ResolvedPair = { userAId: string; userBId: string };
  const resolvedPairs: ResolvedPair[] = [];

  if (hasPairs) {
    for (const p of body.pairs!) {
      const ra = resolvePairId(p.userAId || "");
      const rb = resolvePairId(p.userBId || "");
      if (!ra.ok) {
        return new Response(
          JSON.stringify({
            error: ra.message,
            ...(ra.candidateUserIds && { candidateUserIds: ra.candidateUserIds }),
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (!rb.ok) {
        return new Response(
          JSON.stringify({
            error: rb.message,
            ...(rb.candidateUserIds && { candidateUserIds: rb.candidateUserIds }),
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (ra.id === rb.id) {
        return new Response(JSON.stringify({ error: "Invalid pair (same id)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      resolvedPairs.push({ userAId: ra.id, userBId: rb.id });
    }
  } else {
    if (!profileRows?.length && offlineByNorm.size === 0) {
      return new Response(JSON.stringify({ error: "No enrolled profiles and no offline participants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const p of body.pairsByName!) {
      const ra = resolveNameToId(p.a || "");
      const rb = resolveNameToId(p.b || "");
      if (!ra.ok) {
        return new Response(
          JSON.stringify({
            error: ra.error,
            ...(ra.candidateUserIds && { candidateUserIds: ra.candidateUserIds }),
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (!rb.ok) {
        return new Response(
          JSON.stringify({
            error: rb.error,
            ...(rb.candidateUserIds && { candidateUserIds: rb.candidateUserIds }),
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (ra.id === rb.id) {
        return new Response(JSON.stringify({ error: "Invalid pair (names)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      resolvedPairs.push({ userAId: ra.id, userBId: rb.id });
    }
  }

  const partnerMap = new Map<string, Set<string>>();
  for (const { userAId, userBId } of resolvedPairs) {
    if (!partnerMap.has(userAId)) partnerMap.set(userAId, new Set());
    if (!partnerMap.has(userBId)) partnerMap.set(userBId, new Set());
    partnerMap.get(userAId)!.add(userBId);
    partnerMap.get(userBId)!.add(userAId);
  }

  const allIds = [...partnerMap.keys()];
  const onlineIds = allIds.filter((id) => !isOfflineId(id));

  const [{ data: profiles }, { data: privateRows }] = await Promise.all([
    onlineIds.length
      ? supabase.from("profiles").select("id, first_name").in("id", onlineIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string }[], error: null }),
    onlineIds.length
      ? supabase.from("private_profile_data").select("user_id, email, phone_number").in("user_id", onlineIds)
      : Promise.resolve({ data: [] as { user_id: string; email: string | null; phone_number: string | null }[], error: null }),
  ]);

  const privateMap = new Map(
    (privateRows || []).map((r: { user_id: string; email: string | null; phone_number: string | null }) => [
      r.user_id,
      r,
    ]),
  );
  const profileMap = new Map(
    (profiles || []).map((p: { id: string; first_name: string }) => [p.id, p]),
  );

  const missing: string[] = [];
  for (const uid of onlineIds) {
    const pr = profileMap.get(uid);
    const em = privateMap.get(uid)?.email;
    if (!pr?.first_name || !em) {
      missing.push(uid);
    }
  }

  for (const oid of allIds.filter(isOfflineId)) {
    const norm = parseOfflineId(oid);
    if (!norm || !offlineByNorm.has(norm)) {
      missing.push(oid);
    }
  }

  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ error: "Missing profile/email or offline entry", ids: missing }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const eventName = (body.eventName || eventRow.name || "event").trim();
  const emailSubject =
    body.emailSubject?.trim() || `Your ${eventName} mutual matches`;

  function partnerContactBlock(partnerId: string): string {
    if (isOfflineId(partnerId)) {
      const norm = parseOfflineId(partnerId)!;
      const o = offlineByNorm.get(norm)!;
      const phone = o.phone?.trim();
      const phoneRow = phone
        ? `<tr><td style="color:#a5b4fc;font-size:14px;padding:4px 0;width:88px;">Phone</td><td style="color:#e8e9ff;font-size:14px;padding:4px 0;">${escapeHtml(phone)}</td></tr>`
        : "";
      return `<div style="background:rgba(129,140,248,0.12);border-left:4px solid #6f5bff;padding:16px;margin:14px 0;border-radius:4px;">
<table style="width:100%;border-collapse:collapse;">
<tr><td style="color:#a5b4fc;font-size:14px;padding:4px 0;">Name</td><td style="color:#e8e9ff;font-size:14px;padding:4px 0;">${escapeHtml(o.firstName)}</td></tr>
<tr><td style="color:#a5b4fc;font-size:14px;padding:4px 0;">Email</td><td style="color:#e8e9ff;font-size:14px;padding:4px 0;">${escapeHtml(o.email)}</td></tr>
${phoneRow}
</table></div>`;
    }
    const p = profileMap.get(partnerId)!;
    const priv = privateMap.get(partnerId)!;
    const phone = priv.phone_number?.trim();
    const phoneRow = phone
      ? `<tr><td style="color:#a5b4fc;font-size:14px;padding:4px 0;width:88px;">Phone</td><td style="color:#e8e9ff;font-size:14px;padding:4px 0;">${escapeHtml(phone)}</td></tr>`
      : "";
    return `<div style="background:rgba(129,140,248,0.12);border-left:4px solid #6f5bff;padding:16px;margin:14px 0;border-radius:4px;">
<table style="width:100%;border-collapse:collapse;">
<tr><td style="color:#a5b4fc;font-size:14px;padding:4px 0;">Name</td><td style="color:#e8e9ff;font-size:14px;padding:4px 0;">${escapeHtml(p.first_name)}</td></tr>
<tr><td style="color:#a5b4fc;font-size:14px;padding:4px 0;">Email</td><td style="color:#e8e9ff;font-size:14px;padding:4px 0;">${escapeHtml(priv.email || "")}</td></tr>
${phoneRow}
</table></div>`;
  }

  function buildContentHtml(forUserId: string): string {
    const partnerIds = [...partnerMap.get(forUserId)!];
    const blocks = partnerIds.map((pid) => partnerContactBlock(pid));

    const intro =
      partnerIds.length === 1
        ? `<p style="margin:0 0 12px 0;">You and the person below selected each other at <strong>${escapeHtml(eventName)}</strong>. Here are their contact details so you can stay in touch.</p>`
        : `<p style="margin:0 0 12px 0;">You and the people below selected each other at <strong>${escapeHtml(eventName)}</strong>. Here are their contact details so you can stay in touch.</p>`;

    return `${intro}${blocks.join("")}`;
  }

  function displayFirstName(forUserId: string): string {
    if (isOfflineId(forUserId)) {
      const norm = parseOfflineId(forUserId)!;
      return offlineByNorm.get(norm)!.firstName;
    }
    return profileMap.get(forUserId)!.first_name;
  }

  function displayEmail(forUserId: string): string {
    if (isOfflineId(forUserId)) {
      const norm = parseOfflineId(forUserId)!;
      return offlineByNorm.get(norm)!.email;
    }
    return privateMap.get(forUserId)!.email || "";
  }

  const recipientsOnline = onlineIds.map((userId) => ({
    userId,
    customData: { content: buildContentHtml(userId) },
  }));

  const preview = allIds.map((id) => ({
    id,
    offline: isOfflineId(id),
    firstName: displayFirstName(id),
    email: displayEmail(id),
    partnerCount: partnerMap.get(id)?.size ?? 0,
  }));

  if (body.dryRun) {
    return new Response(
      JSON.stringify({
        ok: true,
        dryRun: true,
        eventId,
        resolvedPairs,
        recipientCount: allIds.length,
        preview,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const blankTemplate = await loadBlankAnnouncementTemplate();
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const BATCH = 100;
  const results: unknown[] = [];

  for (let i = 0; i < recipientsOnline.length; i += BATCH) {
    const batch = recipientsOnline.slice(i, i + BATCH);
    const { data, error } = await supabase.functions.invoke("send-user-emails", {
      headers: { "X-Cron-Secret": cronSecret },
      body: {
        emailType: "blank_announcement",
        emailSubject,
        recipients: batch,
      },
    });
    results.push({ type: "send-user-emails", batch: Math.floor(i / BATCH), data, error: error?.message });
    if (error) {
      console.error("send-user-emails invoke error", error);
      return new Response(
        JSON.stringify({
          error: "send-user-emails failed",
          details: error.message,
          partialResults: results,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  const offlineRecipientIds = allIds.filter(isOfflineId);
  if (offlineRecipientIds.length > 0) {
    if (!Deno.env.get("RESEND_API_KEY")) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured (needed for offline participants)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const offlinePayload = offlineRecipientIds.map((uid) => {
      const html = fillBlankTemplate(
        blankTemplate,
        displayFirstName(uid),
        emailSubject,
        buildContentHtml(uid),
      );
      return {
        from: "Orbiit Team <orbiit@yourorbiit.org>",
        to: [displayEmail(uid)],
        subject: emailSubject,
        html,
      };
    });
    const batchResponse = await resend.batch.send(offlinePayload);
    results.push({ type: "resend-offline", batchResponse });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      eventId,
      emailsSent: allIds.length,
      resolvedPairs,
      onlineCount: onlineIds.length,
      offlineCount: offlineRecipientIds.length,
      results,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
