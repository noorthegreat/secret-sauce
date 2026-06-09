export function isPreviewFallbackAllowed() {
  const explicitOverride = process.env.RESIDENT_CONCIERGE_ALLOW_PREVIEW_FALLBACK?.trim().toLowerCase()

  if (explicitOverride === "true") {
    return true
  }

  return process.env.NODE_ENV !== "production"
}
