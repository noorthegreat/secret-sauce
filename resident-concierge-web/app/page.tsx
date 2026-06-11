import Link from "next/link"

import { FifthCircleBrandMark, FifthCircleSeal } from "@/components/fifth-circle-brand-mark"

const principles = [
  {
    step: "01",
    title: "Private by design",
    copy:
      "No public profiles. No social feed. One building, one private residential community at a time.",
  },
  {
    step: "02",
    title: "Thoughtful introductions",
    copy:
      "We learn just enough about residents to surface warm, compatible introductions that feel natural.",
  },
  {
    step: "03",
    title: "Community Pulse",
    copy:
      "Building teams can quietly understand participation, introductions, and gathering momentum in one view.",
  },
] as const

export default function Page() {
  return (
    <main className="min-h-screen bg-[#1f1a15] text-[#f3ebdc]">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-[#3a3128] px-6 py-8 lg:border-b-0 lg:border-r lg:px-8 lg:py-10">
          <FifthCircleBrandMark
            theme="dark"
            align="left"
            caption="Private resident communities, thoughtfully connected."
          />
          <nav className="mt-12 space-y-4 font-mono text-[11px] uppercase tracking-[0.28em] text-[#bfa774]">
            <p>01 — Landing page</p>
            <p>02 — Resident home</p>
            <p>03 — Resident profile</p>
            <p>04 — Gatherings</p>
            <p>05 — Onboarding</p>
            <p>06 — Community Pulse</p>
          </nav>
          <p className="mt-12 max-w-[180px] text-xs leading-relaxed text-[#b8ab97]">
            The forgotten circle is closer than you think. Fifth Circle helps buildings become
            communities.
          </p>
        </aside>

        <div className="bg-[#f3ebdc] text-[#2d241d]">
          <section className="grid border-b border-[#e2d6c3] lg:grid-cols-[1.1fr_0.9fr]">
            <div className="px-8 py-12 sm:px-12 lg:px-16 lg:py-16">
              <p className="font-mono text-[11px] uppercase tracking-[0.36em] text-[#b89655]">
                Fifth Circle for buildings
              </p>
              <h1 className="mt-8 max-w-xl font-serif text-5xl leading-[0.94] sm:text-6xl">
                Meaningful connections,
                <span className="block italic text-[#c29a51]">close to home.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-8 text-[#66574a]">
                Most of us know people across the world and not the neighbors living down the hall.
                Fifth Circle quietly changes that — one building at a time.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/for-buildings"
                  className="rounded-full bg-[#251e18] px-6 py-3 text-sm font-medium tracking-[0.18em] text-[#f3ebdc]"
                >
                  Request a pilot
                </Link>
                <Link
                  href="/join-community?invite=CHORUS"
                  className="rounded-full border border-[#c7b9a4] px-6 py-3 text-sm font-medium tracking-[0.18em] text-[#2d241d]"
                >
                  Resident access
                </Link>
                <Link
                  href="/manager/dashboard"
                  className="rounded-full border border-[#c7b9a4] px-6 py-3 text-sm font-medium tracking-[0.18em] text-[#2d241d]"
                >
                  Community Pulse
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-center border-t border-[#e2d6c3] bg-[#ede1cf] px-8 py-12 lg:border-l lg:border-t-0 lg:px-12">
              <div className="flex flex-col items-center gap-6 text-center">
                <FifthCircleSeal theme="light" className="size-52" />
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#b89655]">
                  The circle closest to home.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-0 sm:grid-cols-3">
            {principles.map((item) => (
              <article
                key={item.step}
                className="border-b border-[#e2d6c3] px-8 py-8 last:border-b-0 sm:border-b-0 sm:border-r last:sm:border-r-0 sm:px-10"
              >
                <p className="font-serif text-4xl leading-none text-[#d8c29a]">{item.step}</p>
                <h2 className="mt-5 font-serif text-2xl text-[#2d241d]">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[#66574a]">{item.copy}</p>
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  )
}
