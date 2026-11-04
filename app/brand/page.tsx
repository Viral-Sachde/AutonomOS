import type { Metadata } from "next";
import { ArrowLeft, Download } from "lucide-react";
import { DEPARTMENTS } from "@/lib/departments";

export const metadata: Metadata = {
  title: "AutonomOS | Brand kit",
  description: "Logos, colours, type and voice for AutonomOS.",
};

const MARKS = [
  { file: "mark.svg", label: "Primary mark", bg: "#f4f4f5" },
  { file: "mark-light.svg", label: "Light mark", bg: "#0b0b0e" },
  { file: "mark-pulse.svg", label: "Pulse mark", bg: "#f4f4f5" },
];

const COLORS = [
  { name: "Ink", hex: "#0B0B0E", use: "Backgrounds, primary text on light", text: "#fff" },
  { name: "Paper", hex: "#FFFFFF", use: "Surfaces, primary text on dark", text: "#0b0b0e" },
  { name: "Pulse", hex: "#7C5CFF", use: "The orchestrator. Accent and primary actions", text: "#fff" },
  { name: "Mist", hex: "#F4F4F5", use: "Quiet sections and frames", text: "#0b0b0e" },
  { name: "Steel", hex: "#9A9AA6", use: "Secondary text on dark", text: "#0b0b0e" },
];

const VOICE = [
  ["Plain over clever", "Say what the agent did and what happens next."],
  ["Specific over vague", "\"Booked 4 demos\" beats \"drove engagement\"."],
  ["Calm over hype", "Autonomous, not unsupervised. No exclamation marks."],
  ["No em dashes", "Use a comma, colon or a new sentence instead."],
];

export default function BrandPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-[#111113]">
      <header className="border-b border-[#ececf0]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <a href="/" className="flex items-center gap-2 text-[14px] text-[#55555f] hover:text-[#111113]">
            <ArrowLeft size={15} /> AutonomOS
          </a>
          <span className="font-mono text-[12px] text-[#8a8a94]">brand kit v1</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-20 px-4 py-14 md:px-6">
        <section>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark-light.svg" alt="AutonomOS" width={320} height={64} className="h-14 w-auto" />
          <h1 className="mt-8 max-w-3xl text-5xl font-bold tracking-[-0.04em] md:text-6xl">A conductor and four sections.</h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-[#55555f]">
            The mark is the product. A white core, the orchestrator, sits at the centre with a Pulse violet heart. Four satellites are the departments it delegates to, each in its own colour, wired back to the core. Department marks light up their own satellite.
          </p>
        </section>

        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7c5cff]">Marks</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {MARKS.map((m) => (
              <a key={m.file} href={`/brand/${m.file}`} download className="group rounded-3xl border border-[#ececf0] p-4">
                <div className="flex h-44 items-center justify-center rounded-2xl" style={{ background: m.bg }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/brand/${m.file}`} alt="" width={96} height={96} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[14px]">
                  <span className="font-semibold">{m.label}</span>
                  <span className="flex items-center gap-1 text-[#8a8a94] group-hover:text-[#111113]"><Download size={14} /> SVG</span>
                </div>
              </a>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[["wordmark-light.svg", "#ffffff", "Wordmark on light"], ["wordmark-dark.svg", "#0b0b0e", "Wordmark on dark"]].map(([f, bg, label]) => (
              <a key={f} href={`/brand/${f}`} download className="group rounded-3xl border border-[#ececf0] p-4">
                <div className="flex h-36 items-center justify-center rounded-2xl border border-[#f0f0f3]" style={{ background: bg }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/brand/${f}`} alt="" width={260} height={52} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[14px]">
                  <span className="font-semibold">{label}</span>
                  <span className="flex items-center gap-1 text-[#8a8a94] group-hover:text-[#111113]"><Download size={14} /> SVG</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7c5cff]">Department marks</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {DEPARTMENTS.map((d) => (
              <a key={d.id} href={d.mark} download className="rounded-3xl border border-[#ececf0] p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.mark} alt="" width={64} height={64} className="rounded-2xl" />
                <p className="mt-4 text-[17px] font-bold tracking-tight">{d.name}</p>
                <p className="text-[13px] text-[#6b6b76]">{d.blurb}</p>
                <p className="mt-2 font-mono text-[12px]" style={{ color: d.color }}>{d.color.toUpperCase()}</p>
              </a>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7c5cff]">Colour</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            {COLORS.map((c) => (
              <div key={c.name} className="overflow-hidden rounded-3xl border border-[#ececf0]">
                <div className="flex h-28 items-end p-4" style={{ background: c.hex, color: c.text }}>
                  <span className="font-mono text-[12px]">{c.hex}</span>
                </div>
                <div className="p-4">
                  <p className="font-bold">{c.name}</p>
                  <p className="text-[12.5px] leading-snug text-[#6b6b76]">{c.use}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-2xl text-[14px] text-[#6b6b76]">
            Mostly monochrome. Pulse is the only accent outside a department context, and department colours appear only where that department is the subject.
          </p>
        </section>

        <section className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7c5cff]">Type</h2>
            <div className="mt-5 rounded-3xl border border-[#ececf0] p-6">
              <p className="text-6xl font-bold tracking-[-0.045em]">Aa</p>
              <p className="mt-4 text-[17px] font-semibold">Geist, 400 to 800</p>
              <p className="text-[14px] text-[#6b6b76]">Display at bold with tight tracking (-4%). Body at regular.</p>
              <p className="mt-6 font-mono text-2xl">Geist Mono</p>
              <p className="text-[14px] text-[#6b6b76]">Labels, numbers, timestamps, agent ids.</p>
            </div>
          </div>
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7c5cff]">Voice</h2>
            <ul className="mt-5 divide-y divide-[#ececf0] rounded-3xl border border-[#ececf0]">
              {VOICE.map(([t, b]) => (
                <li key={t} className="p-5">
                  <p className="font-semibold">{t}</p>
                  <p className="text-[14px] text-[#6b6b76]">{b}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
