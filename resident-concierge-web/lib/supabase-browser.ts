"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let browserClient: SupabaseClient | null = null

function getPublicSupabaseUrl() {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim()

  if (!value) {
    throw new Error(
      "Missing required public Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.",
    )
  }

  return value
}

function getPublicSupabaseAnonKey() {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!value) {
    throw new Error(
      "Missing required public Supabase key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    )
  }

  return value
}

export function getSupabaseBrowser() {
  if (browserClient) {
    return browserClient
  }

  browserClient = createClient(
    getPublicSupabaseUrl(),
    getPublicSupabaseAnonKey(),
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storageKey: "resident-concierge-auth",
      },
    },
  )

  return browserClient
}
