import { cn } from "@/lib/utils"

type FifthCircleBrandMarkProps = {
  className?: string
  caption?: string
  theme?: "light" | "dark"
  align?: "left" | "center"
}

export function FifthCircleBrandMark({
  className,
  caption = "The circle closest to home.",
  theme = "light",
  align = "center",
}: FifthCircleBrandMarkProps) {
  const isDark = theme === "dark"

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      <FifthCircleSeal theme={theme} />
      <div>
        <p
          className={cn(
            "font-serif text-xl uppercase tracking-[0.5em]",
            isDark ? "text-background" : "text-foreground",
          )}
        >
          Fifth Circle
        </p>
        <p
          className={cn(
            "mt-2 font-mono text-[10px] uppercase tracking-[0.38em]",
            isDark ? "text-gold/90" : "text-gold",
          )}
        >
          {caption}
        </p>
      </div>
    </div>
  )
}

export function FifthCircleSeal({
  theme = "light",
  className,
}: {
  theme?: "light" | "dark"
  className?: string
}) {
  const stroke = theme === "dark" ? "rgba(243, 235, 220, 0.9)" : "rgba(46, 39, 31, 0.88)"
  const accent = "rgba(193, 154, 81, 0.95)"

  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={cn("size-16", className)}
      fill="none"
    >
      <circle cx="60" cy="60" r="52" stroke={accent} strokeWidth="2.5" />
      <circle cx="60" cy="60" r="38" stroke={stroke} strokeWidth="2.5" />
      <circle cx="60" cy="60" r="26" stroke={stroke} strokeWidth="2.5" />
      <circle cx="60" cy="60" r="14" stroke={stroke} strokeWidth="2.5" />
      <circle cx="60" cy="60" r="3.5" fill={stroke} />
    </svg>
  )
}
