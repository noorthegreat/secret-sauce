/**
 * admin-reset-venue-less-dates
 *
 * Finds future confirmed dates where confirmed_venue_id IS NULL (these were
 * auto-confirmed without going through venue voting due to a bug in the
 * availability-save flow). Resets each one back to pending, runs venue
 * selection, and emails both users.
 *
 * POST body:
 * {
 *   dryRun?: boolean   // default false — pass true to preview without writing
 * }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authenticateEdgeRequest } from "../_shared/auth.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const auth = await authenticateEdgeRequest(req, { requireAdmin: true });
        if (auth.error) {
            return new Response(JSON.stringify({ error: auth.error.message }), {
                status: auth.error.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const body = await req.json().catch(() => ({}));
        const dryRun: boolean = body.dryRun ?? false;

        const supabase = auth.context!.supabase;
        const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
        const now = new Date().toISOString();

        // Find future confirmed dates with no confirmed_venue_id
        const { data: badDates, error: fetchError } = await supabase
            .from("dates")
            .select("id, user1_id, user2_id, date_time, location, user1_availability, user2_availability")
            .eq("status", "confirmed")
            .is("confirmed_venue_id", null)
            .gt("date_time", now);

        if (fetchError) throw fetchError;

        if (!badDates || badDates.length === 0) {
            return new Response(
                JSON.stringify({ message: "No affected dates found.", updated: [], dryRun }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        const results: any[] = [];

        for (const date of badDates) {
            const result: any = {
                dateId: date.id,
                oldDateTime: date.date_time,
                oldLocation: date.location,
                dryRun,
            };

            if (!dryRun) {
                // 1. Reset to pending
                const { error: resetError } = await supabase
                    .from("dates")
                    .update({
                        status: "pending",
                        date_time: null,
                        location: null,
                        address: null,
                        user1_confirmed: false,
                        user2_confirmed: false,
                        confirmed_venue_id: null,
                        venue_options: null,
                    })
                    .eq("id", date.id);

                if (resetError) {
                    result.error = resetError.message;
                    results.push(result);
                    continue;
                }

                // 2. Run venue selection if both users have availability
                const hasU1 = date.user1_availability && Object.keys(date.user1_availability).length > 0;
                const hasU2 = date.user2_availability && Object.keys(date.user2_availability).length > 0;

                let venueRefreshResult: any = null;
                if (hasU1 && hasU2) {
                    const { data: refreshData, error: refreshError } = await supabase.functions.invoke(
                        "refresh-venue-options",
                        {
                            body: { dateId: date.id },
                            headers: { "X-Cron-Secret": cronSecret },
                        },
                    );
                    if (!refreshError) venueRefreshResult = refreshData;
                }

                result.venueRefreshResult = venueRefreshResult;

                // 3. Fetch names for emails
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, first_name")
                    .in("id", [date.user1_id, date.user2_id]);

                const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.first_name]));
                const user1Name = profileMap.get(date.user1_id) ?? "there";
                const user2Name = profileMap.get(date.user2_id) ?? "there";

                // 4. Email both users
                const venuesFound = venueRefreshResult?.success && !venueRefreshResult?.skipped;
                const emailContent = venuesFound
                    ? `<p>We've made a small update to your upcoming date with <strong>{{partnerName}}</strong>.</p>
<p>We've refreshed your venue options — please head to the app and pick your preferred spot. Once you both vote, your date will be confirmed.</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="https://yourorbiit.com/dates" style="background: linear-gradient(135deg, #e9d5ff 0%, #c4b5fd 100%); border: 1px solid #a78bfa; color: #111827 !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">Pick My Venue</a>
</div>`
                    : `<p>We need a little more info to confirm your date with <strong>{{partnerName}}</strong>.</p>
<p>Please head to the app and update your availability so we can find the best time and place for you both.</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="https://yourorbiit.com/dates" style="background: linear-gradient(135deg, #e9d5ff 0%, #c4b5fd 100%); border: 1px solid #a78bfa; color: #111827 !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">Update Availability</a>
</div>`;

                await supabase.functions.invoke("send-user-emails", {
                    body: {
                        emailType: "blank_announcement",
                        emailSubject: "Action needed: confirm your date 📅",
                        recipients: [
                            {
                                userId: date.user1_id,
                                customData: {
                                    content: emailContent.replace("{{partnerName}}", user2Name),
                                    subjectHeader: "Date Update",
                                },
                            },
                            {
                                userId: date.user2_id,
                                customData: {
                                    content: emailContent.replace("{{partnerName}}", user1Name),
                                    subjectHeader: "Date Update",
                                },
                            },
                        ],
                    },
                    headers: { "X-Cron-Secret": cronSecret },
                });

                result.emailsSent = true;
            }

            results.push(result);
        }

        return new Response(
            JSON.stringify({
                message: dryRun
                    ? `Dry run: found ${results.length} affected date(s).`
                    : `Reset ${results.length} date(s) and sent emails.`,
                updated: results,
                dryRun,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("Error in admin-reset-venue-less-dates:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
