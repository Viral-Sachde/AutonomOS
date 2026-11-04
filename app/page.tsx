import type { Metadata } from "next";
import {
  ArrowRight, BadgeCheck, BrainCircuit, CalendarClock, CircleDollarSign, GitBranch,
  History, Layers, ShieldCheck, Sparkles, Workflow,
} from "lucide-react";
import HeroDemo from "@/components/landing/HeroDemo";
import { DEPARTMENTS, TOTAL_AGENTS } from "@/lib/departments";

export const metadata: Metadata = {
  title: "AutonomOS | The operating system for an autonomous company",
  description:
    "AutonomOS plans work, delegates it to AI agents across marketing, sales, intelligence and operations, and tracks every outcome. You approve; it ships.",
};

const GITHUB = "https://github.com/Viral-Sachde/AutonomOS";

const PREVIEW: Record<string, { label: string; value: string }[]> = {
  marketing: [
    { label: "Posts queued", value: "12" },
    { label: "Approved this week", value: "9" },
  ],
  sales: [
    { label: "Open pipeline", value: "$110k" },
    { label: "Meetings booked", value: "4" },
  ],
  intelligence: [
    { label: "Rivals tracked", value: "3" },
    { label: "Signals this week", value: "6" },
  ],
  operations: [
    { label: "Tasks done", value: "41" },
    { label: "Hours saved", value: "~26" },
  ],
};

const FEATURES = [
  { icon: ShieldCheck, title: "Human in the loop", body: "Nothing customer-facing ships until you approve it. Agents draft, you decide." },
  { icon: CircleDollarSign, title: "Runs at $0", body: "Every agent has a template fallback. Demo the whole platform with no API credits, add a model when you are ready." },
  { icon: History, title: "Anti-repetition memory", body: "A shared usage history keeps agents from repeating the same angle, hook or lead twice." },
  { icon: CalendarClock, title: "Cron-driven", body: "Agents wake on a schedule, pick up due work and publish approved content in peak windows." },
  { icon: BrainCircuit, title: "Bring your model", body: "Claude or Gemini behind one switch. Swap providers without touching a single agent." },
  { icon: GitBranch, title: "Open source", body: "Next.js, Supabase and plain TypeScript. Read every prompt, fork every agent." },
];

const FAQ = [
  { q: "What does the orchestrator actually do?", a: "You give it a goal in plain language. It breaks the goal into tasks, assigns each to the right department agent in a sensible order, watches the hand-offs and records the outcome on the operations board." },
  { q: "Do I need API credits to try it?", a: "No. Out of the box every agent runs on built-in templates and seeded demo data. Set ORCHESTRATOR_AI=on and an AI provider key when you want real model output." },
  { q: "Will it post or email without asking?", a: "No. Content and outreach land in a review state first. You approve, edit or discard before anything leaves the building." },
  { q: "Which departments are included?", a: `Marketing, Sales, Intelligence and Operations, with ${TOTAL_AGENTS} agents between them. Marketing is the most mature: it writes, illustrates, schedules and publishes to Instagram.` },
  { q: "Can I self-host it?", a: "Yes. It is a single Next.js app. Deploy it anywhere that runs Node, point it at Supabase for storage, and you are done." },
];

function Mark({ size = 28 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/mark.svg" alt="" width={size} height={size} className="rounded-[8px]" />;
}

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5">
      <Mark />
      <span className="text-[17px] font-bold tracking-tight text-[#111113]">
        Autonom<span className="text-[#7c5cff]">OS</span>
      </span>
    </a>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-[#111113] antialiased">
      {/* Announcement */}
      <a href="/dashboard#command" className="block bg-[#111113] px-4 py-2 text-center text-[13px] text-white/90 hover:text-white">
        <span className="mr-2 rounded-full bg-[#7c5cff] px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
        Sales, Intelligence and Operations are live. Plan a goal and watch four teams run it
        <ArrowRight size={13} className="ml-1 inline -translate-y-px" />
      </a>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[#ececf0] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-[14px] text-[#55555f] md:flex">
            <a href="#departments" className="hover:text-[#111113]">Departments</a>
            <a href="#how" className="hover:text-[#111113]">How it works</a>
            <a href="#features" className="hover:text-[#111113]">Features</a>
            <a href="#faq" className="hover:text-[#111113]">FAQ</a>
            <a href="/brand" className="hover:text-[#111113]">Brand</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href="/login" className="hidden rounded-full px-4 py-2 text-[14px] font-medium text-[#111113] hover:bg-[#f4f4f5] sm:inline-block">Sign in</a>
            <a href="/dashboard" className="rounded-full bg-[#111113] px-4 py-2 text-[14px] font-medium text-white hover:bg-black">
              Open dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-4 pb-10 pt-16 md:px-6 md:pt-24">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-0 mx-auto h-[520px] max-w-5xl opacity-70"
          style={{ background: "radial-gradient(60% 50% at 50% 0%, rgba(124,92,255,0.16), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <a href={GITHUB} className="inline-flex items-center gap-2 rounded-full border border-[#e6e6ea] bg-white px-3 py-1 text-[13px] text-[#55555f] shadow-sm hover:border-[#d4d4da]">
            <span className="flex -space-x-1">
              {DEPARTMENTS.map((d) => <span key={d.id} className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: d.color }} />)}
            </span>
            {TOTAL_AGENTS} agents, 4 departments, 1 orchestrator
            <ArrowRight size={13} />
          </a>
          <h1 className="mt-6 text-[44px] font-bold leading-[1.02] tracking-[-0.045em] sm:text-6xl md:text-[76px]">
            The operating system for an autonomous company
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-[#55555f]">
            AutonomOS plans the work, delegates it to AI agents across marketing, sales, intelligence and operations, and tracks every outcome. You approve. It ships.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="/dashboard#command" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#111113] px-6 py-3 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_24px_-8px_rgba(17,17,19,0.5)] hover:bg-black sm:w-auto">
              Try the orchestrator <ArrowRight size={16} />
            </a>
            <a href={GITHUB} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#e2e2e7] bg-white px-6 py-3 text-[15px] font-semibold text-[#111113] hover:bg-[#f7f7f8] sm:w-auto">
              <GitBranch size={16} /> View on GitHub
            </a>
          </div>
          <p className="mt-4 text-[13px] text-[#8a8a94]">No credit card. No API credits. Runs on built-in demo data until you plug in a model.</p>
        </div>

        {/* Product frame */}
        <div className="relative mx-auto mt-14 max-w-5xl">
          <div className="rounded-[28px] border border-[#ececf0] bg-[#f4f4f5] p-2 shadow-[0_30px_80px_-30px_rgba(17,17,19,0.35)] md:p-3">
            <div className="overflow-hidden rounded-[20px] border border-black/40 bg-[#0b0b0e]">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 truncate rounded-md bg-white/[0.06] px-3 py-1 font-mono text-[11px] text-white/50">autonomos.app/dashboard#command</span>
              </div>
              <div className="flex">
                <aside className="hidden w-48 shrink-0 border-r border-white/[0.06] p-4 lg:block">
                  <div className="mb-5 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/mark.svg" alt="" width={22} height={22} className="rounded-md ring-1 ring-white/10" />
                    <span className="text-[13px] font-bold text-white">Autonom<span className="text-[#8b7bff]">OS</span></span>
                  </div>
                  {[["Command", "#7c5cff"], ...DEPARTMENTS.map((d) => [d.name, d.color])].map(([n, c], i) => (
                    <div key={n} className={`mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] ${i === 0 ? "bg-white/[0.07] text-white" : "text-white/50"}`}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} /> {n}
                    </div>
                  ))}
                </aside>
                <div className="min-w-0 flex-1 p-4 md:p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[2px] text-white/40">orchestrator</p>
                  <p className="mb-4 mt-1 text-[22px] font-semibold tracking-tight text-white md:text-[26px]">What should the company do next?</p>
                  <HeroDemo />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Built on */}
      <section className="px-4 py-10 md:px-6">
        <p className="text-center text-[13px] text-[#8a8a94]">Built on tools you already trust</p>
        <div className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[17px] font-semibold tracking-tight text-[#a1a1aa]">
          {["Next.js", "Claude", "Gemini", "Supabase", "Vercel", "Instagram Graph API"].map((n) => <span key={n}>{n}</span>)}
        </div>
      </section>

      {/* Departments */}
      <section id="departments" className="scroll-mt-20 px-4 py-20 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7c5cff]">Departments</p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.035em] md:text-5xl">One orchestrator. Four teams that never sleep.</h2>
            <p className="mt-4 text-[17px] text-[#55555f]">Each department is a squad of specialist agents with its own tools, memory and review step.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {DEPARTMENTS.map((d) => (
              <article key={d.id} className="group relative overflow-hidden rounded-3xl border border-[#ececf0] bg-white p-6 shadow-[0_1px_2px_rgba(17,17,19,0.04)] transition-shadow hover:shadow-[0_20px_50px_-24px_rgba(17,17,19,0.25)] md:p-8">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.12] blur-2xl transition-opacity group-hover:opacity-25" style={{ background: d.color }} />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.mark} alt="" width={48} height={48} className="rounded-xl" />
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight">{d.name}</h3>
                      <p className="text-[14px] text-[#6b6b76]">{d.blurb}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border px-2.5 py-1 text-[12px] font-medium" style={{ color: d.color, borderColor: `${d.color}40`, background: `${d.color}0f` }}>
                    {d.id === "marketing" ? 10 : d.agents.length} agents
                  </span>
                </div>
                <ul className="relative mt-6 grid gap-2 sm:grid-cols-2">
                  {d.agents.map((a) => (
                    <li key={a.id} className="rounded-xl border border-[#f0f0f3] bg-[#fafafa] p-3">
                      <p className="text-[14px] font-semibold">{a.name}</p>
                      <p className="mt-0.5 text-[12.5px] leading-snug text-[#6b6b76]">{a.role}</p>
                    </li>
                  ))}
                </ul>
                <div className="relative mt-5 flex items-center gap-6 border-t border-[#f0f0f3] pt-5">
                  {PREVIEW[d.id].map((p) => (
                    <div key={p.label}>
                      <p className="text-2xl font-bold tracking-tight" style={{ color: d.color }}>{p.value}</p>
                      <p className="text-[12px] text-[#8a8a94]">{p.label}</p>
                    </div>
                  ))}
                  <a href={`/dashboard#${d.id === "marketing" ? "agents" : d.id}`} className="ml-auto inline-flex items-center gap-1 text-[14px] font-semibold hover:underline">
                    Open <ArrowRight size={14} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 bg-[#f7f7f8] px-4 py-20 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7c5cff]">How it works</p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.035em] md:text-5xl">From a sentence to shipped work</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { n: "01", icon: Sparkles, title: "Plan", body: "Type a goal. The orchestrator breaks it into ordered tasks with owners, dependencies and time estimates." },
              { n: "02", icon: Layers, title: "Delegate", body: "Each task goes to the specialist agent best suited to it. Research runs before content, content before outreach." },
              { n: "03", icon: Workflow, title: "Track", body: "Watch the work move on a live board. Approve drafts, and get a Friday report written from real outcomes." },
            ].map((s) => (
              <div key={s.n} className="rounded-3xl border border-[#ececf0] bg-white p-7">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111113] text-white"><s.icon size={20} /></span>
                  <span className="font-mono text-[13px] text-[#a1a1aa]">{s.n}</span>
                </div>
                <h3 className="mt-6 text-2xl font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#55555f]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 px-4 py-20 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7c5cff]">Features</p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.035em] md:text-5xl">Autonomous, not unsupervised</h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-[#ececf0] bg-[#ececf0] sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white p-7">
                <f.icon size={22} className="text-[#7c5cff]" />
                <h3 className="mt-4 text-[18px] font-bold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#55555f]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="px-4 md:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[#0b0b0e] px-6 py-14 text-white md:px-12">
          <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[640px] -translate-x-1/2 rounded-full bg-[#7c5cff] opacity-30 blur-3xl" />
          <div className="relative grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {[
              [String(TOTAL_AGENTS), "specialist agents"],
              ["4", "departments"],
              ["$0", "to start"],
              ["100%", "approved before it ships"],
            ].map(([v, l]) => (
              <div key={l}>
                <p className="text-5xl font-bold tracking-[-0.04em] md:text-6xl">{v}</p>
                <p className="mt-2 text-[14px] text-white/60">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 px-4 py-20 md:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-4xl font-bold tracking-[-0.035em] md:text-5xl">Questions, answered</h2>
          <div className="mt-10 divide-y divide-[#ececf0] rounded-3xl border border-[#ececf0]">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold">
                  {f.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e6e6ea] text-[#6b6b76] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-[#55555f]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-20 md:px-6">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-[#ececf0] bg-[#f7f7f8] px-6 py-16 text-center md:px-12">
          <div className="mx-auto mb-6 w-fit"><Mark size={56} /></div>
          <h2 className="mx-auto max-w-2xl text-4xl font-bold tracking-[-0.035em] md:text-5xl">Hire a company of agents in one click</h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] text-[#55555f]">Open the dashboard, give the orchestrator a goal and watch Marketing, Sales, Intelligence and Operations get to work.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="/dashboard#command" className="inline-flex items-center gap-2 rounded-full bg-[#111113] px-6 py-3 text-[15px] font-semibold text-white hover:bg-black">
              Open the dashboard <ArrowRight size={16} />
            </a>
            <a href="/brand" className="inline-flex items-center gap-2 rounded-full border border-[#e2e2e7] bg-white px-6 py-3 text-[15px] font-semibold hover:bg-[#fafafa]">
              <BadgeCheck size={16} /> Brand kit
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#ececf0] px-4 py-10 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Logo />
            <p className="mt-2 text-[13px] text-[#8a8a94]">AI company orchestration platform.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-[#55555f]">
            <a href="#departments" className="hover:text-[#111113]">Departments</a>
            <a href="#how" className="hover:text-[#111113]">How it works</a>
            <a href="/brand" className="hover:text-[#111113]">Brand</a>
            <a href={GITHUB} className="hover:text-[#111113]">GitHub</a>
            <a href="/dashboard" className="hover:text-[#111113]">Dashboard</a>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-[12px] text-[#a1a1aa]">© {new Date().getFullYear()} AutonomOS. Demo figures on this page come from seeded sample data.</p>
      </footer>
    </div>
  );
}
