import { createClient } from "@supabase/supabase-js"

let cachedClient: ReturnType<typeof createClient> | null = null

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getSupabaseAdmin() {
  if (cachedClient) {
    return cachedClient
  }

  const url = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return cachedClient
}
