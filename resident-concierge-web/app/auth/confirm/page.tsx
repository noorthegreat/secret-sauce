"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { EmailOtpType } from "@supabase/supabase-js"

import { Button } from "@/components/ui/button"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

const supportedTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email",
  "email_change",
])

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app/profile"
  }

  return value
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<AuthConfirmFallback />}>
      <AuthConfirmPageContent />
    </Suspense>
  )
}

function AuthConfirmPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const nextPath = useMemo(() => normalizeNextPath(searchParams.get("next")), [searchParams])

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const accessToken = hashParams.get("access_token")
    const refreshToken = hashParams.get("refresh_token")

    if (!accessToken || !refreshToken) {
      return
    }

    setIsLoading(true)

    void getSupabaseBrowser()
      .auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error }) => {
        if (error) {
          setErrorMessage(error.message)
          return
        }

        router.replace(nextPath)
        router.refresh()
      })
      .finally(() => setIsLoading(false))
  }, [nextPath, router])

  async function handleConfirm() {
    const supabase = getSupabaseBrowser()
    const tokenHash = searchParams.get("token_hash")
    const code = searchParams.get("code")
    const type = searchParams.get("type")

    setIsLoading(true)
    setErrorMessage(null)

    try {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          throw error
        }

        router.replace(nextPath)
        router.refresh()
        return
      }

      if (!tokenHash || !type || !supportedTypes.has(type as EmailOtpType)) {
        throw new Error("This confirmation link is invalid or has expired.")
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      })

      if (error) {
        throw error
      }

      router.replace(nextPath)
      router.refresh()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to verify this link.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-lg rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-gold">Email confirmation</p>
        <h1 className="mt-4 font-serif text-4xl text-foreground">Confirm your account</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Verify your email, then we&apos;ll send you back into the resident experience.
        </p>

        {errorMessage ? (
          <p className="mt-6 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <Button
          type="button"
          onClick={handleConfirm}
          className="mt-8 h-11 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
          disabled={isLoading}
        >
          {isLoading ? "Verifying..." : "Confirm email"}
        </Button>
      </div>
    </main>
  )
}

function AuthConfirmFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="rounded-[2rem] border border-border bg-card px-8 py-6 text-center shadow-sm">
        <p className="font-serif text-3xl text-foreground">Preparing confirmation...</p>
      </div>
    </main>
  )
}
