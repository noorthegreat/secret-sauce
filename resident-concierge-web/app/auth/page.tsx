"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"

import { FifthCircleBrandMark } from "@/components/fifth-circle-brand-mark"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app"
  }

  return value
}

function getEmailRedirect(nextPath: string) {
  const origin = window.location.origin
  const url = new URL("/auth/confirm", origin)
  url.searchParams.set("next", nextPath)
  return url.toString()
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>
  )
}

function AuthPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const nextPath = useMemo(() => normalizeNextPath(searchParams.get("next")), [searchParams])
  const isManagerJourney = nextPath.startsWith("/manager")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)
    setNotice(null)

    try {
      const trimmedEmail = email.trim().toLowerCase()
      if (!trimmedEmail || trimmedEmail.length > 255) {
        throw new Error("Enter a valid email address.")
      }

      if (password.length < 8 || password.length > 72) {
        throw new Error("Use a password between 8 and 72 characters.")
      }

      const supabase = getSupabaseBrowser()

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })

        if (error) {
          throw error
        }

        router.replace(nextPath)
        router.refresh()
        return
      }

      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: getEmailRedirect(nextPath),
        },
      })

      if (error) {
        throw error
      }

      setNotice(
        isManagerJourney
          ? "Check your email to confirm your building-team account, then come back to Community Pulse."
          : "Check your email to confirm your account, then come back here.",
      )
      setMode("signin")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to continue right now.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#1f1a15] text-[#f3ebdc]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <Link
          href={isManagerJourney ? "/for-buildings" : "/join-community"}
          className="mb-10 inline-flex w-fit items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-[#b8ab97] transition-colors hover:text-[#f3ebdc]"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        <div className="mb-12 flex justify-center">
          <FifthCircleBrandMark
            theme="dark"
            caption="Private building access"
            className="gap-4"
          />
        </div>

        <section className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#b89655]">
            {isManagerJourney ? "Building team sign in" : "Resident sign in"}
          </p>
          <h1 className="mt-5 font-serif text-4xl leading-[1.02]">
            {mode === "signin"
              ? isManagerJourney
                ? "Welcome to"
                : "Welcome to"
              : "Create your"}
            <span className="block italic text-[#c29a51]">
              {mode === "signin"
                ? isManagerJourney
                  ? "Community Pulse."
                  : "your building."
                : "account."}
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-[#b8ab97]">
            {mode === "signin"
              ? isManagerJourney
                ? "Use the same work email you submitted on the pilot request. Community Pulse opens once your building-team access has been provisioned."
                : "Use the email tied to your resident request so we can connect you to the right building membership and unlock your onboarding."
              : isManagerJourney
                ? "Create a secure building-team sign-in. Dashboard access still needs to be activated for your building."
                : "This account stays private to your building community and never becomes a public profile."}
          </p>
        </section>

        <div className="mt-8 rounded-full border border-[#4a4034] bg-[#2a231c] p-1">
          {(["signin", "signup"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value)
                setErrorMessage(null)
                setNotice(null)
              }}
              className={[
                "w-1/2 rounded-full px-4 py-3 text-sm font-medium transition-colors",
                mode === value ? "bg-[#f3ebdc] text-[#2d241d]" : "text-[#b8ab97]",
              ].join(" ")}
            >
              {value === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {!isManagerJourney ? (
          <p className="mt-5 text-center text-sm leading-7 text-[#a99780]">
            {mode === "signin" ? (
              <>
                Need access first?{" "}
                <Link
                  href="/join-community"
                  className="text-[#f3ebdc] underline decoration-[#8d7043] underline-offset-4"
                >
                  Request entry to your building
                </Link>
                .
              </>
            ) : (
              <>
                Already approved?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin")
                    setErrorMessage(null)
                    setNotice(null)
                  }}
                  className="text-[#f3ebdc] underline decoration-[#8d7043] underline-offset-4"
                >
                  Sign in instead
                </button>
                .
              </>
            )}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            placeholder="you@buildingemail.com"
          />
          <Field
            id="password"
            label="Password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
          />

          {errorMessage ? (
            <p className="rounded-[1.4rem] border border-[#6d433f] bg-[#382320] px-4 py-3 text-sm text-[#efb0a6]">
              {errorMessage}
            </p>
          ) : null}

          {notice ? (
            <p className="rounded-[1.4rem] border border-[#7a6640] bg-[#2d271d] px-4 py-3 text-sm text-[#f0dfbe]">
              {notice}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#4a4034] bg-[#231d17] text-sm font-medium tracking-[0.18em] text-[#f3ebdc] transition-colors hover:border-[#b89655] disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Working
              </>
            ) : mode === "signin" ? (
              "Continue"
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-[#867664]">
          {isManagerJourney
            ? "Private. Building-scoped. Manager access only."
            : "Private. Building-scoped. Concierge-led."}
        </p>
      </div>
    </main>
  )
}

function AuthPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1f1a15] px-6 py-12 text-[#f3ebdc]">
      <div className="text-center">
        <p className="font-serif text-3xl">Loading secure access...</p>
      </div>
    </main>
  )
}

function Field({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  type: string
  autoComplete: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-[#9f917e]">
        {label}
      </span>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-[1rem] border border-[#42382d] bg-[#2a231c] px-4 text-sm text-[#f3ebdc] outline-none transition-colors placeholder:text-[#7f7262] focus:border-[#b89655]"
        required
      />
    </label>
  )
}
