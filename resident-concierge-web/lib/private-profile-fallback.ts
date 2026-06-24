type PrivateProfileEmailRow = {
  user_id: string
  email: string | null
}

type SupabaseLikeClient = {
  from: (table: string) => {
    select: (columns: string) => {
      in: (column: string, values: string[]) => {
        returns: <T>() => Promise<{ data: T | null; error: unknown | null }>
      }
    }
  }
  auth: {
    admin: {
      getUserById: (
        userId: string,
      ) => Promise<{ data: { user: { email?: string | null } | null }; error: unknown | null }>
    }
  }
}

function readErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : ""
}

function readErrorMessage(error: unknown) {
  return typeof error === "object" && error !== null && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : ""
}

export function isMissingPrivateProfileTableError(error: unknown) {
  return (
    readErrorCode(error) === "PGRST205" &&
    readErrorMessage(error).toLowerCase().includes("private_profile_data")
  )
}

export async function getPrivateProfileEmailsByUserIds(
  supabase: SupabaseLikeClient,
  userIds: string[],
) {
  if (userIds.length === 0) {
    return new Map<string, string>()
  }

  const { data, error } = await supabase
    .from("private_profile_data")
    .select("user_id, email")
    .in("user_id", userIds)
    .returns<PrivateProfileEmailRow[]>()

  if (!error) {
    return new Map(
      (data ?? [])
        .map((row) => [row.user_id, row.email?.trim().toLowerCase() ?? ""] as const)
        .filter((entry) => entry[1]),
    )
  }

  if (!isMissingPrivateProfileTableError(error)) {
    throw error
  }

  const resolvedEntries = await Promise.all(
    userIds.map(async (userId) => {
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId)
      if (authError) {
        throw authError
      }

      const normalizedEmail = authData.user?.email?.trim().toLowerCase() ?? ""
      return [userId, normalizedEmail] as const
    }),
  )

  return new Map(resolvedEntries.filter((entry) => entry[1]))
}
