import { getSupabaseAdmin } from "@/lib/supabase-admin"

type IntroductionRow = {
  id: string
  building_id: string
  resident_a_user_id: string
  resident_b_user_id: string
  status: string
  requested_by_user_id: string | null
  compatibility_summary: string | null
}

type ResidentContact = {
  userId: string
  firstName: string
  email: string | null
  phone: string | null
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function canSendNotifications() {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      (process.env.CRON_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  )
}

async function loadResidentContacts(userIds: string[]): Promise<Map<string, ResidentContact>> {
  const supabase = getSupabaseAdmin()
  const uniqueIds = [...new Set(userIds)]

  const [{ data: profiles }, { data: privateProfiles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name")
      .in("id", uniqueIds)
      .returns<{ id: string; first_name: string | null }[]>(),
    supabase
      .from("private_profile_data")
      .select("user_id, email, phone_number")
      .in("user_id", uniqueIds)
      .returns<{ user_id: string; email: string | null; phone_number: string | null }[]>(),
  ])

  const contacts = new Map<string, ResidentContact>()

  for (const userId of uniqueIds) {
    const profile = profiles?.find((row) => row.id === userId)
    const privateProfile = privateProfiles?.find((row) => row.user_id === userId)

    contacts.set(userId, {
      userId,
      firstName: profile?.first_name?.trim() || "there",
      email: privateProfile?.email?.trim() || null,
      phone: privateProfile?.phone_number?.trim() || null,
    })
  }

  return contacts
}

async function invokeResidentEmail({
  emailSubject,
  recipients,
}: {
  emailSubject: string
  recipients: Array<{ userId: string; customData: { content: string } }>
}) {
  if (!canSendNotifications() || recipients.length === 0) {
    return
  }

  const supabase = getSupabaseAdmin()
  const cronSecret = process.env.CRON_SECRET?.trim() ?? ""
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ""

  const { error } = await supabase.functions.invoke("send-user-emails", {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(cronSecret ? { "X-Cron-Secret": cronSecret } : {}),
    },
    body: {
      emailType: "blank_announcement",
      emailSubject,
      recipients,
    },
  })

  if (error) {
    console.error("resident introduction email failed", error)
  }
}

function buildRequestedEmail(firstName: string, requesterFirstName: string, summary: string | null) {
  const reason = summary
    ? `<p style="margin:0 0 16px;line-height:1.6;">${escapeHtml(summary)}</p>`
    : ""

  return `
    <p style="margin:0 0 16px;line-height:1.6;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 16px;line-height:1.6;">
      <strong>${escapeHtml(requesterFirstName)}</strong> in your building would like a private introduction through Fifth Circle.
    </p>
    ${reason}
    <p style="margin:0;line-height:1.6;">Open your community app to accept, pause, or decline when you are ready.</p>
  `
}

function buildMutualEmail(firstName: string, partnerFirstName: string, summary: string | null) {
  const reason = summary
    ? `<p style="margin:0 0 16px;line-height:1.6;">${escapeHtml(summary)}</p>`
    : ""

  return `
    <p style="margin:0 0 16px;line-height:1.6;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 16px;line-height:1.6;">
      You and <strong>${escapeHtml(partnerFirstName)}</strong> both said yes to an introduction in your building community.
    </p>
    ${reason}
    <p style="margin:0;line-height:1.6;">Your concierge will help with the next step. You can also schedule a meetup in the app.</p>
  `
}

function buildDeliveredEmail(
  firstName: string,
  partnerFirstName: string,
  partnerEmail: string | null,
  partnerPhone: string | null,
) {
  const contactLines = [
    partnerEmail ? `<li>Email: ${escapeHtml(partnerEmail)}</li>` : null,
    partnerPhone ? `<li>Phone: ${escapeHtml(partnerPhone)}</li>` : null,
  ].filter(Boolean)

  const contactBlock =
    contactLines.length > 0
      ? `<ul style="margin:0 0 16px;padding-left:20px;line-height:1.6;">${contactLines.join("")}</ul>`
      : `<p style="margin:0 0 16px;line-height:1.6;">Contact details are not on file yet. Reply to your building team if you need help.</p>`

  return `
    <p style="margin:0 0 16px;line-height:1.6;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 16px;line-height:1.6;">
      Your concierge introduction with <strong>${escapeHtml(partnerFirstName)}</strong> is ready.
    </p>
    ${contactBlock}
    <p style="margin:0;line-height:1.6;">Please reach out respectfully and keep the conversation building-scoped.</p>
  `
}

export async function notifyIntroductionTransition(
  previous: IntroductionRow | null,
  next: IntroductionRow,
) {
  if (!canSendNotifications()) {
    return
  }

  const participantIds = [next.resident_a_user_id, next.resident_b_user_id]
  const contacts = await loadResidentContacts(participantIds)
  const summary = next.compatibility_summary?.trim() || null

  if (next.status === "requested" && previous?.status !== "requested") {
    const requesterId = next.requested_by_user_id
    if (!requesterId) return

    const recipientId =
      requesterId === next.resident_a_user_id ? next.resident_b_user_id : next.resident_a_user_id
    const recipient = contacts.get(recipientId)
    const requester = contacts.get(requesterId)

    if (!recipient?.email || !requester) return

    await invokeResidentEmail({
      emailSubject: "A neighbor would like an introduction",
      recipients: [
        {
          userId: recipient.userId,
          customData: {
            content: buildRequestedEmail(
              recipient.firstName,
              requester.firstName,
              summary,
            ),
          },
        },
      ],
    })
    return
  }

  if (next.status === "mutual" && previous?.status !== "mutual") {
    const residentA = contacts.get(next.resident_a_user_id)
    const residentB = contacts.get(next.resident_b_user_id)

    if (!residentA || !residentB) return

    const recipients = [residentA, residentB]
      .filter((resident) => Boolean(resident.email))
      .map((resident) => {
        const partner =
          resident.userId === residentA.userId ? residentB : residentA

        return {
          userId: resident.userId,
          customData: {
            content: buildMutualEmail(resident.firstName, partner.firstName, summary),
          },
        }
      })

    await invokeResidentEmail({
      emailSubject: "Mutual interest in your building community",
      recipients,
    })
  }
}

export async function notifyIntroductionDelivered(introduction: IntroductionRow) {
  if (!canSendNotifications()) {
    return
  }

  const contacts = await loadResidentContacts([
    introduction.resident_a_user_id,
    introduction.resident_b_user_id,
  ])
  const residentA = contacts.get(introduction.resident_a_user_id)
  const residentB = contacts.get(introduction.resident_b_user_id)

  if (!residentA || !residentB) return

  const recipients = [residentA, residentB]
    .filter((resident) => Boolean(resident.email))
    .map((resident) => {
      const partner =
        resident.userId === residentA.userId ? residentB : residentA

      return {
        userId: resident.userId,
        customData: {
          content: buildDeliveredEmail(
            resident.firstName,
            partner.firstName,
            partner.email,
            partner.phone,
          ),
        },
      }
    })

  await invokeResidentEmail({
    emailSubject: "Your concierge introduction is ready",
    recipients,
  })
}
