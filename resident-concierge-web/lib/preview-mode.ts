export function isPreviewFallbackAllowed() {
  if (process.env.NODE_ENV === "production") {
    return process.env.RESIDENT_CONCIERGE_ALLOW_PREVIEW_FALLBACK?.trim().toLowerCase() === "true"
  }

  return process.env.RESIDENT_CONCIERGE_ALLOW_PREVIEW_FALLBACK?.trim().toLowerCase() !== "false"
}
