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

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return cachedClient
}
