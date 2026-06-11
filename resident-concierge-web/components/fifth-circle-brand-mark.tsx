type FifthCircleBrandMarkProps = {
  className?: string
  caption?: string
}

export function FifthCircleBrandMark({
  className,
  caption = "The circle closest to home.",
}: FifthCircleBrandMarkProps) {
  return (
    <div
      className={[
        "overflow-hidden rounded-[2.2rem] border border-border/80 bg-background/90 p-3 shadow-[0_30px_80px_-46px_rgba(70,56,35,0.35)] backdrop-blur-sm",
        className ?? "",
      ].join(" ")}
    >
      <img
        src="/fifth-circle-logo.png"
        alt="Fifth Circle logo"
        className="w-full rounded-[1.7rem] object-cover"
      />
      <p className="px-2 pb-2 pt-4 text-center font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
        {caption}
      </p>
    </div>
  )
}
