"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app/profile"
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

      setNotice("Check your email to confirm your account, then come back here.")
      setMode("signin")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to continue right now.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="flex flex-col justify-center">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to Fifth Circle
            </Link>

            <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.35em] text-gold">
              Private building access
            </p>
            <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[0.95] text-foreground sm:text-6xl">
              Sign in to your building community.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              Your matches, events, and resident experience stay private to your building. Use the
              same email you plan to use for Fifth Circle.
            </p>
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-7 shadow-sm sm:p-9">
            <div className="flex rounded-full border border-border bg-secondary p-1">
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
                    "flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                    mode === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {value === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                <p className="rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}

              {notice ? (
                <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-foreground">
                  {notice}
                </p>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Working...
                  </>
                ) : mode === "signin" ? (
                  "Continue"
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Resident access is still building-scoped on the backend. Creating an account does not
              automatically approve a resident request.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}

function AuthPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="rounded-[2rem] border border-border bg-card px-8 py-6 text-center shadow-sm">
        <p className="font-serif text-3xl text-foreground">Loading secure access...</p>
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
      <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-gold/50"
        required
      />
    </label>
  )
}
