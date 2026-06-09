"use client"

import { useEffect, useState } from "react"

import type { ResidentAccountSnapshot } from "@/lib/resident-account-server"
import { useResidentSession } from "@/lib/session-browser"

type ResidentAccountState = {
  snapshot: ResidentAccountSnapshot | null
  errorMessage: string | null
  isLoading: boolean
}

export function useResidentAccount() {
  const { session, user, isLoading: sessionLoading } = useResidentSession()
  const [state, setState] = useState<ResidentAccountState>({
    snapshot: null,
    errorMessage: null,
    isLoading: true,
  })

  useEffect(() => {
    const accessToken = session?.access_token

    if (sessionLoading) {
      setState((current) => ({ ...current, isLoading: true }))
      return
    }

    if (!user || !accessToken) {
      setState({
        snapshot: null,
        errorMessage: null,
        isLoading: false,
      })
      return
    }

    let isMounted = true

    const loadAccount = async () => {
      setState((current) => ({ ...current, isLoading: true, errorMessage: null }))

      try {
        const response = await fetch("/api/resident-account", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        })

        const payload = (await response.json()) as ResidentAccountSnapshot & { error?: string }

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load resident account.")
        }

        if (!isMounted) {
          return
        }

        setState({
          snapshot: payload,
          errorMessage: null,
          isLoading: false,
        })
      } catch (error) {
        if (!isMounted) {
          return
        }

        setState({
          snapshot: null,
          errorMessage: error instanceof Error ? error.message : "Unable to load resident account.",
          isLoading: false,
        })
      }
    }

    void loadAccount()

    return () => {
      isMounted = false
    }
  }, [session?.access_token, sessionLoading, user])

  return state
}
