/*
Sends users emails based on the email type. 
Sends up to 100 emails at a time (limited by Resend's batch API).

Example request payload:
{
  "emailType": "new_match",
  "recipients": [
  {"userId": "b7fcb0f9-41c0-4c5d-87df-2fd08d539a91"},
  {"userId": "736c6724-717c-43e6-a99e-789a8c39a0dd"}
  ]
}
*/

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { authenticateEdgeRequest } from "../_shared/auth.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface EmailRecipient {
  userId: string;
  customData?: any;
}

interface EmailRequest {
  emailType: 'new_match' | 'event_match' | 'new_date' | 'date_reminder' | 'date_update' | 'match_cancelled' | 'date_cancelled' | 'auto-cancelled-date' | 'no_overlap' | 'first_confirm' | 'date_rescheduled' | 'date_confirmed_details' | 'date_update_reset' | 'new_dates_launch' | 'date_reminder_1d' | 'date_reminder_1h' | 'date_reminder_soon' | 'date_missing_availability' | 'date_availability_deadline_warning' | 'date_planning_reminder_48h' | 'date_planning_reminder_soon' | 'event_announcement' | 'blank_announcement' | 'inactivity_warning' | 'inactivity_paused' | 'availability_strike_warning' | 'availability_strike_paused' | 'feedback_request' | 'feedback_reminder_1d' | 'feedback_reminder_7d' | 'mutual_outcome' | 'continuation_feedback_request' | 'venue_vote';
  emailSubject?: string;
  recipients: EmailRecipient[];
  dateId?: string;
}

// ... existing helpers

async function generateDateUpdateResetEmail(
  firstName: string,
  partnerName: string
): Promise<string> {
  const template = await loadTemplate('date-update-reset');
  return replaceVariables(template, {
    firstName,
    partnerName,
  });
}



// ... existing helpers

async function generateDateConfirmedDetailsEmail(
  firstName: string,
  partnerName: string,
  dateDetails: { date: string; weekday: string; time: string; locationName: string; locationAddress: string }
): Promise<string> {
  const template = await loadTemplate('date-confirmed-details');
  return replaceVariables(template, {
    firstName,
    partnerName,
    date: dateDetails.date,
    weekday: dateDetails.weekday,
    time: dateDetails.time,
    locationName: dateDetails.locationName,
    locationAddress: dateDetails.locationAddress,
  });
}


// ... inside handler


interface Profile {
  id: string;
  first_name: string;
  email: string;
}

type DateAccessRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string | null;
  date_time: string | null;
};

const USER_ALLOWED_DATE_EMAIL_TYPES = new Set<EmailRequest["emailType"]>([
  "date_cancelled",
  "no_overlap",
  "first_confirm",
  "date_rescheduled",
  "date_confirmed_details",
  "mutual_outcome",
  "venue_vote",
]);

async function loadTemplate(templateName: string): Promise<string> {
  // Don't forget to upload the config.toml for additional static files!
  const path = `./_templates/${templateName}.html`;
  return await Deno.readTextFile(path);
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;

  // Always add copyright year
  const allVariables = {
    ...variables,
    year: new Date().getFullYear().toString()
  };

  for (const [key, value] of Object.entries(allVariables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

async function generateMatchEmail(template: string, firstName: string): Promise<string> {

  return replaceVariables(template, {
    firstName,
  });
}

async function generateEventMatchEmail(
  template: string,
  firstName: string,
  eventName: string
): Promise<string> {
  return replaceVariables(template, {
    firstName,
    eventName,
  });
}

async function generateDateReminderSoonEmail(
  firstName: string,
  partnerName: string,
  partnerPhone: string,
  dateDetails: { date: string; weekday: string; time: string; locationName: string; locationAddress: string }
): Promise<string> {
  const template = await loadTemplate('date-reminder-soon');
  return replaceVariables(template, {
    firstName,
    partnerName,
    partnerPhone,
    date: dateDetails.date,
    weekday: dateDetails.weekday,
    time: dateDetails.time,
    locationName: dateDetails.locationName,
    locationAddress: dateDetails.locationAddress,
  });
}

async function generateMatchCancelledEmail(firstName: string): Promise<string> {
  const template = await loadTemplate('match-cancelled');
  return replaceVariables(template, {
    firstName,
  });
}

async function generateDateCancelledEmail(
  firstName: string,
  partnerName: string,
  cancellationReason: string
): Promise<string> {
  const template = await loadTemplate('date-cancelled');
  let cancellationSection = "";
  if (cancellationReason == "No reason provided") {
    cancellationSection = "";
  } else {
    cancellationSection = `<p style="color: #ffffff; font-size: 16px; margin: 20px 0;">They provided the following reason:</p>

    <div
        style="background: rgba(129, 140, 248, 0.12); border-left: 4px solid #6f5bff; padding: 15px; margin: 20px 0; font-style: italic; color: #ffffff;">
        ${cancellationReason}
    </div>`;
  }
  return replaceVariables(template, {
    firstName,
    partnerName,
    cancellationSection,
  });
}

async function generateDateEmail(
  firstName: string,
  partnerName: string,
  firstDay: string
): Promise<string> {
  const template = await loadTemplate('new-date');

  return replaceVariables(template, {
    firstName,
    partnerName,
    firstDay,
  });
}

async function generateDateReminderEmail(
  firstName: string,
  partnerName: string,
  dateDetails: { location: string; date_time: string; activity?: string }
): Promise<string> {
  const template = await loadTemplate('date-reminder');

  const activitySection = dateDetails.activity
    ? `<p style="color: #ffffff; font-size: 16px; margin: 15px 0;"><strong>🎯 Activity:</strong> ${dateDetails.activity}</p>`
    : '';

  return replaceVariables(template, {
    firstName,
    partnerName,
    location: dateDetails.location,
    dateTime: new Date(dateDetails.date_time).toLocaleString(),
    activitySection,
  });
}

async function generateDateUpdateEmail(
  firstName: string,
  partnerName: string,
  changes: string[],
  dateDetails: { location?: string; date_time?: string; activity?: string }
): Promise<string> {
  const template = await loadTemplate('date-update');

  const changesList = changes.map(change => `<li style="margin: 8px 0;">${change}</li>`).join('');

  const locationSection = dateDetails.location
    ? `<p style="color: #ffffff; font-size: 16px; margin: 15px 0;"><strong>📍 Location:</strong> ${dateDetails.location}</p>`
    : '';

  const timeSection = dateDetails.date_time
    ? `<p style="color: #ffffff; font-size: 16px; margin: 15px 0;"><strong>🕐 Time:</strong> ${new Date(dateDetails.date_time).toLocaleString()}</p>`
    : '';

  const activitySection = dateDetails.activity
    ? `<p style="color: #ffffff; font-size: 16px; margin: 15px 0;"><strong>🎯 Activity:</strong> ${dateDetails.activity}</p>`
    : '';

  return replaceVariables(template, {
    firstName,
    partnerName,
    changesList,
    locationSection,
    timeSection,
    activitySection,
  });
}

async function generateNoOverlapEmail(
  firstName: string,
  partnerName: string
): Promise<string> {
  const template = await loadTemplate('no-overlap');
  return replaceVariables(template, {
    firstName,
    partnerName,
  });
}

async function generateFirstConfirmEmail(
  firstName: string,
  partnerName: string
): Promise<string> {
  const template = await loadTemplate('first-confirm');
  return replaceVariables(template, {
    firstName,
    partnerName,
  });
}

async function generateNewDatesLaunchEmail(
  template: string,
  firstName: string
): Promise<string> {
  return replaceVariables(template, {
    firstName
  });
}

async function generateEventAnnouncementEmail(
  template: string,
  firstName: string
): Promise<string> {
  return replaceVariables(template, {
    firstName
  });
}

async function generateBlankAnnouncementEmail(
  template: string,
  firstName: string,
  content: string,
  subjectHeader: string
): Promise<string> {
  return replaceVariables(template, {
    firstName,
    content,
    subjectHeader
  });
}

async function generateContinuationFeedbackRequestEmail(
  template: string,
  firstName: string,
  partnerName: string,
  statusPrompt: string,
  ctaUrl: string
): Promise<string> {
  return replaceVariables(template, {
    firstName,
    partnerName,
    statusPrompt,
    ctaUrl,
  });
}

async function generateDateRescheduledEmail(
  firstName: string,
  partnerName: string,
  rescheduleReason?: string
): Promise<string> {
  const template = await loadTemplate('date-rescheduled');

  const reasonSection = rescheduleReason
    ? `<div style="background: rgba(129, 140, 248, 0.12); border-left: 4px solid #6f5bff; padding: 16px 18px; margin: 20px 0 24px; border-radius: 4px; color: #ffffff;"><p style="font-size: 16px; margin: 0; font-style: italic; color: #ffffff;">Reason: "${rescheduleReason}"</p></div>`
    : '';

  return replaceVariables(template, {
    firstName,
    partnerName,
    reasonSection
  });
}

async function generateDateReminder1dEmail(
  firstName: string,
  partnerName: string,
  dateDetails: { date: string; weekday: string; time: string; locationName: string; locationAddress: string }
): Promise<string> {
  const template = await loadTemplate('date-reminder-1d');
  return replaceVariables(template, {
    firstName,
    partnerName,
    date: dateDetails.date,
    weekday: dateDetails.weekday,
    time: dateDetails.time,
    locationName: dateDetails.locationName,
    locationAddress: dateDetails.locationAddress,
  });
}

async function generateDateReminder1hEmail(
  firstName: string,
  partnerName: string,
  partnerPhone: string,
  dateDetails: { date: string; weekday: string; time: string; locationName: string; locationAddress: string }
): Promise<string> {
  const template = await loadTemplate('date-reminder-1h');
  return replaceVariables(template, {
    firstName,
    partnerName,
    partnerPhone,
    date: dateDetails.date,
    weekday: dateDetails.weekday,
    time: dateDetails.time,
    locationName: dateDetails.locationName,
    locationAddress: dateDetails.locationAddress,
  });
}

async function generateDatePlanningReminder48hEmail(
  firstName: string,
  partnerName: string
): Promise<string> {
  const template = await loadTemplate('date-planning-reminder-48h');
  return replaceVariables(template, {
    firstName,
    partnerName,
  });
}

async function generateDateMissingAvailabilityEmail(
  firstName: string,
  partnerName: string
): Promise<string> {
  const template = await loadTemplate('date-missing-availability');
  return replaceVariables(template, {
    firstName,
    partnerName,
  });
}

async function generateDateAvailabilityDeadlineWarningEmail(
  firstName: string,
  partnerName: string
): Promise<string> {
  const template = await loadTemplate('date-availability-deadline-warning');
  return replaceVariables(template, {
    firstName,
    partnerName,
  });
}

async function generateDatePlanningReminderSoonEmail(
  firstName: string,
  partnerName: string,
  firstPossibleDay: string
): Promise<string> {
  const template = await loadTemplate('date-planning-reminder-soon');
  return replaceVariables(template, {
    firstName,
    partnerName,
    firstPossibleDay
  });
}

async function generateVenueVoteEmail(
  firstName: string,
  partnerName: string
): Promise<string> {
  const template = await loadTemplate('venue-vote');
  return replaceVariables(template, {
    firstName,
    partnerName,
  });
}

async function generateAutoCancelledDateEmail(
  firstName: string,
  partnerName: string
): Promise<string> {
  const template = await loadTemplate('auto-cancelled-date');
  return replaceVariables(template, {
    firstName,
    partnerName,
  });
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateEdgeRequest(req, {
      allowCronSecret: true,
      allowServiceRole: true,
    });
    if (auth.error) {
      return new Response(JSON.stringify({ error: auth.error.message }), {
        status: auth.error.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = auth.context!.supabase;
    const requestUser = auth.context!.user;
    const isPrivilegedCaller = auth.context!.isInternal || auth.context!.isAdmin;

    // Check for required env vars
    if (!Deno.env.get("RESEND_API_KEY")) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Parse and validate request
    const payload = await req.json();
    const { emailType, emailSubject, recipients, dateId } = payload as EmailRequest;

    if (!emailType || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request. emailType and recipients array required." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!isPrivilegedCaller) {
      if (!requestUser) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!USER_ALLOWED_DATE_EMAIL_TYPES.has(emailType)) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!dateId) {
        return new Response(
          JSON.stringify({ error: "dateId is required for user-triggered date emails." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (recipients.length > 2) {
        return new Response(
          JSON.stringify({ error: "Too many recipients for user-triggered emails." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: rawDateRow, error: dateError } = await supabase
        .from("dates")
        .select("id, user1_id, user2_id, status, date_time")
        .eq("id", dateId)
        .maybeSingle();

      if (dateError) {
        throw dateError;
      }

      const dateRow = rawDateRow as DateAccessRow | null;

      if (!dateRow) {
        return new Response(
          JSON.stringify({ error: "Date not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const participantIds = new Set([dateRow.user1_id, dateRow.user2_id]);
      if (!participantIds.has(requestUser.id)) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const hasInvalidRecipient = recipients.some((recipient) => !participantIds.has(recipient.userId));
      if (hasInvalidRecipient) {
        return new Response(
          JSON.stringify({ error: "Recipients must belong to the same date." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (emailType === "date_confirmed_details" && (dateRow.status !== "confirmed" || !dateRow.date_time)) {
        return new Response(
          JSON.stringify({ error: "date_confirmed_details can only be sent for confirmed dates." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Special handling for mutual_outcome — server fetches both users' contact info and sends two emails
    if (emailType === 'mutual_outcome') {
      if (!dateId) {
        return new Response(JSON.stringify({ error: "dateId required for mutual_outcome" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: dateRow } = await supabase.from('dates').select('user1_id, user2_id, user1_followup_preference, user2_followup_preference, match_type').eq('id', dateId).single();
      if (!dateRow) {
        return new Response(JSON.stringify({ error: "Date not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const p1 = (dateRow as any).user1_followup_preference;
      const p2 = (dateRow as any).user2_followup_preference;
      if (!p1 || !p2 || p1 !== p2 || p1 === 'pass') {
        return new Response(JSON.stringify({ message: 'No mutual outcome yet' }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const outcomeType = p1 as string;
      const userIds = [(dateRow as any).user1_id, (dateRow as any).user2_id];
      const [{ data: profileRows }, { data: privateRows }] = await Promise.all([
        supabase.from('profiles').select('id, first_name').in('id', userIds),
        supabase.from('private_profile_data').select('user_id, email, phone_number').in('user_id', userIds),
      ]);
      const privateMap = new Map((privateRows || []).map((r: any) => [r.user_id, r]));
      const profileMap = new Map((profileRows || []).map((p: any) => [p.id, { ...p, email: privateMap.get(p.id)?.email ?? null, phone: privateMap.get(p.id)?.phone_number ?? null }]));
      const user1 = profileMap.get((dateRow as any).user1_id);
      const user2 = profileMap.get((dateRow as any).user2_id);
      if (!user1?.email || !user2?.email) {
        return new Response(JSON.stringify({ error: "Could not fetch user contact info" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const subject = outcomeType === 'match' ? "It's a Mutual Match! 🎉❤️" : "You're both friends! 🤝✨";
      const generateMutualHtml = (firstName: string, partnerName: string, partnerEmail: string, partnerPhone: string | null, type: string) => {
        const headline = type === 'match' ? "It's a Mutual Match! 🎉❤️" : "You're Both Friends! 🤝✨";
        const bodyText = type === 'match'
          ? `You and ${partnerName} both want to take things further! Here are their contact details so you can reach out and make it happen.`
          : `You and ${partnerName} both want to stay friends! Here are their contact details so you can keep in touch.`;
        const phoneRow = partnerPhone ? `<tr><td style="color:#a5b4fc;font-size:14px;padding:4px 0;">Phone</td><td style="color:#ffffff;font-size:14px;padding:4px 0;">${partnerPhone}</td></tr>` : '';
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"></head><body style="font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;margin:0;padding:0;background-color:#070b2b;"><div style="max-width:600px;margin:0 auto;background:#0f163f;border-radius:12px;overflow:hidden;box-shadow:0 20px 45px rgba(2,6,23,0.55);"><div style="background:linear-gradient(135deg,#ede9fe 0%,#c4b5fd 100%);padding:40px 20px;text-align:center;"><img src="https://vlaqcfzmsjzgmzxodhkd.supabase.co/storage/v1/object/public/email-assets/orbiit-logo-email.png" alt="Orbiit" style="display:block;margin:0 auto 14px auto;width:132px;max-width:45%;height:auto;border:0;"><h1 style="color:#111827 !important;-webkit-text-fill-color:#111827;text-shadow:none;margin:0;font-size:32px;">${headline}</h1></div><div style="padding:40px 30px;"><h2 style="color:#ffffff;font-size:24px;margin-top:0;">Hi ${firstName},</h2><p style="color:#ffffff;font-size:16px;margin:20px 0;">${bodyText}</p><div style="background:rgba(129,140,248,0.12);border-left:4px solid #6f5bff;padding:20px;margin:25px 0;border-radius:4px;"><table style="width:100%;border-collapse:collapse;"><tr><td style="color:#a5b4fc;font-size:14px;padding:4px 0;width:80px;">Name</td><td style="color:#ffffff;font-size:14px;padding:4px 0;">${partnerName}</td></tr><tr><td style="color:#a5b4fc;font-size:14px;padding:4px 0;">Email</td><td style="color:#ffffff;font-size:14px;padding:4px 0;">${partnerEmail}</td></tr>${phoneRow}</table></div><div style="display:flex;justify-content:space-between;margin-top:30px;border-top:1px solid rgba(148,163,184,0.25);"><p style="color:#ffffff;font-size:14px;">Best regards,<br>The Orbiit Team</p><img src="https://vlaqcfzmsjzgmzxodhkd.supabase.co/storage/v1/object/public/email-assets/orbiit-logo-email.png" style="display:block;height:auto;border:0;width:50%;" width="50%" alt></div></div></div><div style="text-align:center;padding:20px;color:#ffffff;font-size:12px;"><p>© ${new Date().getFullYear()} Orbiit. All rights reserved.</p></div></body></html>`;
      };
      const html1 = generateMutualHtml(user1.first_name, user2.first_name, user2.email, user2.phone, outcomeType);
      const html2 = generateMutualHtml(user2.first_name, user1.first_name, user1.email, user1.phone, outcomeType);
      await resend.batch.send([
        { from: "orbiit@yourorbiit.org", to: [user1.email], subject, html: html1 },
        { from: "orbiit@yourorbiit.org", to: [user2.email], subject, html: html2 },
      ]);
      return new Response(JSON.stringify({ message: 'Mutual outcome emails sent', outcome: outcomeType }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Processing ${emailType} emails for ${recipients.length} recipients`);

    // Fetch user profiles
    const userIds = recipients.map(r => r.userId);
    const [{ data: profileRows, error: profileError }, { data: privateRows }] = await Promise.all([
      supabase.from('profiles').select('id, first_name').in('id', userIds),
      supabase.from('private_profile_data').select('user_id, email').in('user_id', userIds),
    ]);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      throw new Error("Failed to fetch user profiles");
    }

    const privateEmailMap = new Map((privateRows || []).map((r: any) => [r.user_id, r.email]));
    const profiles = (profileRows || []).map((p: any) => ({
      ...p,
      email: privateEmailMap.get(p.id) ?? null,
    }));

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid users found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as { userId: string; error: string }[],
    };

    // Step 1: Prepare all emails first
    interface PreparedEmail {
      userId: string;
      email: string;
      subject: string;
      html: string;
    }

    const preparedEmails: PreparedEmail[] = [];

    let newmatchtemplate = "";
    if (emailType === "new_match") {
      try {
        newmatchtemplate = await loadTemplate('new-match');
      } catch (error) {
        console.error("Failed to load new-match template:", error);
        throw new Error("Failed to load email templates");
      }
    }
    let eventMatchTemplate = "";
    if (emailType === "event_match") {
      try {
        eventMatchTemplate = await loadTemplate('event-match');
      } catch (error) {
        console.error("Failed to load event-match template:", error);
        throw new Error("Failed to load email templates");
      }
    }
    let newdateslaunchtemplate = "";
    if (emailType === "new_dates_launch") {
      try {
        newdateslaunchtemplate = await loadTemplate('new-dates-launch');
      } catch (error) {
        console.error("Failed to load new-dates-launch template:", error);
        throw new Error("Failed to load email templates");
      }
    }
    let eventAnnouncementTemplate = "";
    if (emailType === "event_announcement") {
      try {
        eventAnnouncementTemplate = await loadTemplate('event-announcement');
      } catch (error) {
        console.error("Failed to load event-announcement template:", error);
        throw new Error("Failed to load email templates");
      }
    }
    let blankAnnouncementTemplate = "";
    if (emailType === "blank_announcement") {
      try {
        blankAnnouncementTemplate = await loadTemplate('blank-announcement');
      } catch (error) {
        console.error("Failed to load blank-announcement template:", error);
        throw new Error("Failed to load email templates");
      }
    }
    let continuationFeedbackTemplate = "";
    if (emailType === "continuation_feedback_request") {
      try {
        continuationFeedbackTemplate = await loadTemplate('continued-connection-feedback');
      } catch (error) {
        console.error("Failed to load continued-connection-feedback template:", error);
        throw new Error("Failed to load email templates");
      }
    }
    for (const recipient of recipients) {
      const profile = profiles.find(p => p.id === recipient.userId);

      if (!profile || !profile.email) {
        results.failed.push({
          userId: recipient.userId,
          error: "User profile or email not found"
        });
        continue;
      }

      try {
        let subject = "";
        let html = "";
        if (recipient.customData) {
          console.log("Recipient " + profile.email + " with custom data:", JSON.stringify(recipient.customData));
        }

        // Generate email based on type
        switch (emailType) {
          case 'new_match': {
            subject = `Orbiit - You've got a new match!`;
            html = await generateMatchEmail(newmatchtemplate, profile.first_name);
            break;
          }

          case 'event_match': {
            const { eventName } = recipient.customData || {};
            if (!eventName) {
              throw new Error("Event name required for event_match email");
            }
            subject = `Your ${eventName} pairings are ready`;
            html = await generateEventMatchEmail(eventMatchTemplate, profile.first_name, eventName);
            break;
          }

          case 'new_date': {
            const { partnerName, firstDay } = recipient.customData;
            if (!partnerName) {
              throw new Error("Partner name required for new_date email");
            }
            subject = "You have a new date scheduled! ☕";
            html = await generateDateEmail(profile.first_name, partnerName, firstDay);
            break;
          }

          // case 'date_reminder': {
          //   const { partnerName, dateDetails } = recipient.customData || {};
          //   if (!partnerName || !dateDetails?.location || !dateDetails?.date_time) {
          //     throw new Error("Partner name, location, and date_time required for date_reminder email");
          //   }
          //   subject = "Your date is coming up! 📅";
          //   html = await generateDateReminderEmail(profile.first_name, partnerName, dateDetails);
          //   break;
          // }

          // case 'date_update': {
          //   const { partnerName, changes, dateDetails } = recipient.customData || {};
          //   if (!partnerName || !changes || !Array.isArray(changes)) {
          //     throw new Error("Partner name and changes array required for date_update email");
          //   }
          //   subject = "Your date has been updated 🔄";
          //   html = await generateDateUpdateEmail(profile.first_name, partnerName, changes, dateDetails || {});
          //   break;
          // }

          case 'match_cancelled': {
            subject = "Update regarding your match";
            html = await generateMatchCancelledEmail(profile.first_name);
            break;
          }

          case 'auto-cancelled-date': {
            const { partnerName } = recipient.customData || {};
            if (!partnerName) {
              throw new Error("Partner name required for auto-cancelled-date email");
            }
            subject = "Match Expired ⌛";
            html = await generateAutoCancelledDateEmail(profile.first_name, partnerName);
            break;
          }

          case 'date_cancelled': {
            const { partnerName, cancellationReason } = recipient.customData || {};
            if (!partnerName) {
              throw new Error("Partner name required for date_cancelled email");
            }
            subject = "Update regarding your date";
            html = await generateDateCancelledEmail(
              profile.first_name,
              partnerName,
              cancellationReason || "No reason provided"
            );
            break;
          }

          case 'no_overlap': {
            const { partnerName } = recipient.customData || {};
            if (!partnerName) {
              throw new Error("Partner name required for no_overlap email");
            }
            subject = "Update regarding your date availability";
            html = await generateNoOverlapEmail(profile.first_name, partnerName);
            break;
          }

          case 'venue_vote': {
            const { partnerName } = recipient.customData || {};
            if (!partnerName) {
              throw new Error("Partner name required for venue_vote email");
            }
            subject = "Almost there — pick your date spot! 📍";
            html = await generateVenueVoteEmail(profile.first_name, partnerName);
            break;
          }

          case 'first_confirm': {
            const { partnerName } = recipient.customData || {};
            if (!partnerName) {
              throw new Error("Partner name required for first_confirm email");
            }
            subject = "Date confirmation update";
            html = await generateFirstConfirmEmail(profile.first_name, partnerName);
            break;
          }

          case 'date_rescheduled': {
            const { partnerName, rescheduleReason } = recipient.customData || {};
            if (!partnerName) {
              throw new Error("Partner name required for date_rescheduled email");
            }
            subject = "Date Rescheduled 🗓️";
            html = await generateDateRescheduledEmail(profile.first_name, partnerName, rescheduleReason);
            break;
          }

          case 'date_confirmed_details': {
            const { partnerName, dateDetails } = recipient.customData || {};
            if (!partnerName || !dateDetails) {
              throw new Error("Partner name and dateDetails required for date_confirmed_details email");
            }
            subject = "It's a Date! 🎉";
            html = await generateDateConfirmedDetailsEmail(profile.first_name, partnerName, dateDetails);
            break;
          }

          case 'date_update_reset': {
            const { partnerName } = recipient.customData || {};
            if (!partnerName) {
              throw new Error("Partner name required for date_update_reset email");
            }
            subject = "Date Updated 🔄";
            html = await generateDateUpdateResetEmail(profile.first_name, partnerName);
            break;
          }

          case 'new_dates_launch': {
            subject = "Orbiit - New Dates Feature! 🚀";
            html = await generateNewDatesLaunchEmail(newdateslaunchtemplate, profile.first_name);
            break;
          }

          case 'event_announcement': {
            subject = "Updates on Orbiit + Meet Us IRL at Nachtseminar";
            html = await generateEventAnnouncementEmail(eventAnnouncementTemplate, profile.first_name);
            break;
          }

          case 'blank_announcement': {
            const { content } = recipient.customData || {};
            if (!content) throw new Error("Content required for blank_announcement email");

            subject = emailSubject || "Update from Orbiit ⭐";
            html = await generateBlankAnnouncementEmail(blankAnnouncementTemplate, profile.first_name, content, subject);
            break;
          }

          case 'date_reminder_1d': {
            const { partnerName, dateDetails } = recipient.customData || {};
            if (!partnerName || !dateDetails) {
              throw new Error("Partner name and dateDetails required for date_reminder_1d email");
            }
            subject = "Your date is tomorrow! ⏰";
            html = await generateDateReminder1dEmail(profile.first_name, partnerName, dateDetails);
            break;
          }

          case 'date_reminder_1h': {
            const { partnerName, partnerPhone, dateDetails } = recipient.customData || {};
            if (!partnerName || !dateDetails) {
              throw new Error("Partner name and dateDetails required for date_reminder_1h email");
            }
            subject = "Your date is in 1 hour! ⏳";
            html = await generateDateReminder1hEmail(profile.first_name, partnerName, partnerPhone || "Not available", dateDetails);
            break;
          }

          case 'date_reminder_soon': {
            const { partnerName, partnerPhone, dateDetails } = recipient.customData || {};
            if (!partnerName || !dateDetails) {
              throw new Error("Partner name and dateDetails required for date_reminder_soon email");
            }
            subject = "Your date is coming up soon! ⏳";
            html = await generateDateReminderSoonEmail(profile.first_name, partnerName, partnerPhone || "Not available", dateDetails);
            break;
          }

          case 'date_missing_availability': {
            const { partnerName } = recipient.customData || {};
            if (!partnerName) {
              throw new Error("Partner name required for date_missing_availability email");
            }
            subject = "Please add your availability for your date 📅";
            html = await generateDateMissingAvailabilityEmail(profile.first_name, partnerName);
            break;
          }

          case 'date_availability_deadline_warning': {
            const { partnerName } = recipient.customData || {};
            if (!partnerName) {
              throw new Error("Partner name required for date_availability_deadline_warning email");
            }
            subject = "⚠️ Action Required: Add your availability before it's too late";
            html = await generateDateAvailabilityDeadlineWarningEmail(profile.first_name, partnerName);
            break;
          }

          case 'date_planning_reminder_48h': {
            const { partnerName } = recipient.customData || {};
            if (!partnerName) {
              throw new Error("Partner name required for date_planning_reminder_48h email");
            }
            subject = "Don't forget to plan your date! 📅";
            html = await generateDatePlanningReminder48hEmail(profile.first_name, partnerName);
            break;
          }

          case 'date_planning_reminder_soon': {
            const { partnerName, firstPossibleDay } = recipient.customData || {};
            if (!partnerName || !firstPossibleDay) {
              throw new Error("Partner name and firstPossibleDay required for date_planning_reminder_soon email");
            }
            subject = "Action needed for your date! ⏳";
            html = await generateDatePlanningReminderSoonEmail(profile.first_name, partnerName, firstPossibleDay);
            break;
          }

          case 'feedback_request': {
            const { partnerName } = recipient.customData || {};
            if (!partnerName) {
              throw new Error("Partner name required for feedback_request email");
            }
            subject = "How did it go? Fill out your outcome ✨";
            html = replaceVariables(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"></head><body style="font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #070b2b;"><div style="max-width: 600px; margin: 0 auto; background: #0f163f; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 45px rgba(2, 6, 23, 0.55);"><div style="background: linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%); padding: 40px 20px; text-align: center;"><img src="https://vlaqcfzmsjzgmzxodhkd.supabase.co/storage/v1/object/public/email-assets/orbiit-logo-email.png" alt="Orbiit" style="display:block; margin: 0 auto 14px auto; width: 132px; max-width: 45%; height: auto; border:0;"><h1 style="color: #111827 !important; -webkit-text-fill-color: #111827; text-shadow: none; margin: 0; font-size: 32px;">How did it go? ✨</h1></div><div style="padding: 40px 30px;"><h2 style="color: #ffffff; font-size: 24px; margin-top: 0;">Hi {{firstName}},</h2><p style="color: #ffffff; font-size: 16px; margin: 20px 0;">We hope your meet-up with {{partnerName}} went well! We'd love to hear how it went.</p><div style="background: rgba(129, 140, 248, 0.12); border-left: 4px solid #6f5bff; padding: 20px; margin: 25px 0; border-radius: 4px; color: #ffffff !important;"><p style="margin: 0; font-size: 16px;">Sharing your outcome takes under a minute — it helps us improve Orbiit and fine-tune who we match you with. You'll need to fill it out to keep receiving new matches. 🙏</p></div><div style="text-align: center; margin: 35px 0;"><a href="https://www.yourorbiit.com/dates" style="background-color: #e9d5ff; background: linear-gradient(135deg, #e9d5ff 0%, #c4b5fd 100%); border: 1px solid #a78bfa; color: #111827 !important; -webkit-text-fill-color: #111827; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(167, 139, 250, 0.28);"><span style="color: #111827 !important; -webkit-text-fill-color: #111827; text-shadow: none;">Fill Out Outcome</span></a></div><div style="display: flex; justify-content: space-between; margin-top: 30px; border-top: 1px solid rgba(148, 163, 184, 0.25);"><p style="color: #ffffff; font-size: 14px;">Best regards,<br>The Orbiit Team</p><img src="https://vlaqcfzmsjzgmzxodhkd.supabase.co/storage/v1/object/public/email-assets/orbiit-logo-email.png" style="display: block; height: auto; border: 0; width: 50%;" width="50%" alt title height="auto"></div></div></div><div style="text-align: center; padding: 20px; color: #ffffff; font-size: 12px;"><p>© {{year}} Orbiit. All rights reserved.</p></div></body></html>`, { firstName: profile.first_name, partnerName });
            break;
          }

          case 'feedback_reminder_1d': {
            const { partnerName } = recipient.customData || {};
            if (!partnerName) {
              throw new Error("Partner name required for feedback_reminder_1d email");
            }
            subject = "Reminder: how did your date go? 💬";
            html = replaceVariables(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"></head><body style="font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #070b2b;"><div style="max-width: 600px; margin: 0 auto; background: #0f163f; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 45px rgba(2, 6, 23, 0.55);"><div style="background: linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%); padding: 40px 20px; text-align: center;"><img src="https://vlaqcfzmsjzgmzxodhkd.supabase.co/storage/v1/object/public/email-assets/orbiit-logo-email.png" alt="Orbiit" style="display:block; margin: 0 auto 14px auto; width: 132px; max-width: 45%; height: auto; border:0;"><h1 style="color: #111827 !important; -webkit-text-fill-color: #111827; text-shadow: none; margin: 0; font-size: 32px;">Don't forget ✨</h1></div><div style="padding: 40px 30px;"><h2 style="color: #ffffff; font-size: 24px; margin-top: 0;">Hi {{firstName}},</h2><p style="color: #ffffff; font-size: 16px; margin: 20px 0;">Just a quick nudge — we'd still love to hear how your meet-up with {{partnerName}} went.</p><div style="background: rgba(129, 140, 248, 0.12); border-left: 4px solid #6f5bff; padding: 20px; margin: 25px 0; border-radius: 4px; color: #ffffff !important;"><p style="margin: 0; font-size: 16px;">You'll need to share your outcome to keep receiving new matches. It takes under a minute and helps us improve who we match you with. 🙏</p></div><div style="text-align: center; margin: 35px 0;"><a href="https://www.yourorbiit.com/dates" style="background-color: #e9d5ff; background: linear-gradient(135deg, #e9d5ff 0%, #c4b5fd 100%); border: 1px solid #a78bfa; color: #111827 !important; -webkit-text-fill-color: #111827; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(167, 139, 250, 0.28);"><span style="color: #111827 !important; -webkit-text-fill-color: #111827; text-shadow: none;">Fill Out Outcome</span></a></div><div style="display: flex; justify-content: space-between; margin-top: 30px; border-top: 1px solid rgba(148, 163, 184, 0.25);"><p style="color: #ffffff; font-size: 14px;">Best regards,<br>The Orbiit Team</p><img src="https://vlaqcfzmsjzgmzxodhkd.supabase.co/storage/v1/object/public/email-assets/orbiit-logo-email.png" style="display: block; height: auto; border: 0; width: 50%;" width="50%" alt title height="auto"></div></div></div><div style="text-align: center; padding: 20px; color: #ffffff; font-size: 12px;"><p>© {{year}} Orbiit. All rights reserved.</p></div></body></html>`, { firstName: profile.first_name, partnerName });
            break;
          }

          case 'feedback_reminder_7d': {
            const { partnerName } = recipient.customData || {};
            if (!partnerName) {
              throw new Error("Partner name required for feedback_reminder_7d email");
            }
            subject = "Last reminder: your matches are paused until you share feedback ⏸️";
            html = replaceVariables(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"></head><body style="font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #070b2b;"><div style="max-width: 600px; margin: 0 auto; background: #0f163f; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 45px rgba(2, 6, 23, 0.55);"><div style="background: linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%); padding: 40px 20px; text-align: center;"><img src="https://vlaqcfzmsjzgmzxodhkd.supabase.co/storage/v1/object/public/email-assets/orbiit-logo-email.png" alt="Orbiit" style="display:block; margin: 0 auto 14px auto; width: 132px; max-width: 45%; height: auto; border:0;"><h1 style="color: #111827 !important; -webkit-text-fill-color: #111827; text-shadow: none; margin: 0; font-size: 32px;">One last nudge 🙏</h1></div><div style="padding: 40px 30px;"><h2 style="color: #ffffff; font-size: 24px; margin-top: 0;">Hi {{firstName}},</h2><p style="color: #ffffff; font-size: 16px; margin: 20px 0;">It's been a week since your date with {{partnerName}}, and we still haven't heard how it went.</p><div style="background: rgba(129, 140, 248, 0.12); border-left: 4px solid #6f5bff; padding: 20px; margin: 25px 0; border-radius: 4px; color: #ffffff !important;"><p style="margin: 0; font-size: 16px;">Your new matches are on hold until you share your outcome. It only takes a minute — and it directly shapes who we match you with next. 🙏</p></div><div style="text-align: center; margin: 35px 0;"><a href="https://www.yourorbiit.com/dates" style="background-color: #e9d5ff; background: linear-gradient(135deg, #e9d5ff 0%, #c4b5fd 100%); border: 1px solid #a78bfa; color: #111827 !important; -webkit-text-fill-color: #111827; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(167, 139, 250, 0.28);"><span style="color: #111827 !important; -webkit-text-fill-color: #111827; text-shadow: none;">Share My Outcome</span></a></div><div style="display: flex; justify-content: space-between; margin-top: 30px; border-top: 1px solid rgba(148, 163, 184, 0.25);"><p style="color: #ffffff; font-size: 14px;">Best regards,<br>The Orbiit Team</p><img src="https://vlaqcfzmsjzgmzxodhkd.supabase.co/storage/v1/object/public/email-assets/orbiit-logo-email.png" style="display: block; height: auto; border: 0; width: 50%;" width="50%" alt title height="auto"></div></div></div><div style="text-align: center; padding: 20px; color: #ffffff; font-size: 12px;"><p>© {{year}} Orbiit. All rights reserved.</p></div></body></html>`, { firstName: profile.first_name, partnerName });
            break;
          }

          case 'continuation_feedback_request': {
            const { partnerName, dateId: continuationDateId, matchType } = recipient.customData || {};
            if (!partnerName || !continuationDateId) {
              throw new Error("Partner name and dateId required for continuation_feedback_request email");
            }
            const isFriendship = matchType === "friendship";
            subject = isFriendship ? "Quick friendship check-in" : "Quick dating check-in";
            html = await generateContinuationFeedbackRequestEmail(
              continuationFeedbackTemplate,
              profile.first_name,
              partnerName,
              isFriendship ? "Are you and this person still friends?" : "Did you two keep dating after meeting through Orbiit?",
              `https://www.yourorbiit.com/dates?followup=${encodeURIComponent(String(continuationDateId))}`
            );
            break;
          }

          case 'inactivity_warning': {
            subject = "We miss you on Orbiit! 💫";
            const warningTemplate = await loadTemplate('inactivity-warning');
            html = replaceVariables(warningTemplate, { firstName: profile.first_name });
            break;
          }

          case 'inactivity_paused': {
            subject = "Your Orbiit account has been paused ⏸️";
            const pausedTemplate = await loadTemplate('inactivity-paused');
            html = replaceVariables(pausedTemplate, { firstName: profile.first_name });
            break;
          }

          case 'availability_strike_paused': {
            subject = "⏸️ Your Orbiit account has been paused — 3 strikes reached";
            const strikesPausedTemplate = await loadTemplate('availability-strike-paused');
            html = replaceVariables(strikesPausedTemplate, { firstName: profile.first_name });
            break;
          }

          case 'availability_strike_warning': {
            const { partnerName, strikeCount } = recipient.customData || {};
            if (!partnerName || !strikeCount) {
              throw new Error("partnerName and strikeCount required for availability_strike_warning email");
            }
            subject = `⚠️ Strike ${strikeCount} of 3 — Missing Availability`;
            const strikeTemplate = await loadTemplate('availability-strike-warning');
            html = replaceVariables(strikeTemplate, { firstName: profile.first_name, partnerName, strikeCount: String(strikeCount) });
            break;
          }

          default:
            throw new Error(`Unknown email type: ${emailType}`);
        }

        preparedEmails.push({
          userId: recipient.userId,
          email: profile.email,
          subject,
          html,
        });

      } catch (error: any) {
        console.error(`Failed to prepare email for ${profile.email}:`, error);
        results.failed.push({
          userId: recipient.userId,
          error: error.message || "Unknown error"
        });
      }
    }

    console.log(`Prepared ${preparedEmails.length} emails`);

    // Step 2: Send emails in batches of 100 using batch API
    const BATCH_SIZE = 100;
    const RATE_LIMIT_DELAY_MS = 4000; // 4 seconds between batch API calls

    for (let i = 0; i < preparedEmails.length; i += BATCH_SIZE) {
      const batch = preparedEmails.slice(i, i + BATCH_SIZE);

      try {
        // Prepare batch payload for Resend batch API
        const batchPayload = batch.map(email => ({
          from: "Orbiit Team <orbiit@yourorbiit.org>",
          to: [email.email],
          subject: email.subject,
          html: email.html,
        }));

        console.log(`Sending batch ${Math.floor(i / BATCH_SIZE) + 1} with ${batch.length} emails`);

        // Send batch via Resend batch API
        const batchResponse = await resend.batch.send(batchPayload);

        console.log(`Batch sent:`, batchResponse);

        // Mark all emails in this batch as successful
        // Note: If batch.send returns individual statuses, we should check them
        // For now, assuming all succeed if the batch call succeeds
        for (const email of batch) {
          results.success.push(email.userId);
        }

      } catch (error: any) {
        console.error(`Failed to send batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);

        // Mark all emails in this batch as failed
        for (const email of batch) {
          results.failed.push({
            userId: email.userId,
            error: error.message || "Batch send failed"
          });
        }
      }

      // Add delay between batches to respect rate limits (except for the last batch)
      if (i + BATCH_SIZE < preparedEmails.length) {
        console.log(`Waiting ${RATE_LIMIT_DELAY_MS}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      }
    }

    console.log(`Email sending complete. Success: ${results.success.length}, Failed: ${results.failed.length}`);

    return new Response(
      JSON.stringify({
        message: "Email processing complete",
        results,
        summary: {
          total: recipients.length,
          sent: results.success.length,
          failed: results.failed.length
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-user-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
