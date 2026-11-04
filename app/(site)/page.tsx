import type { Metadata } from "next";
import { ArrowRight, Check, Eye, ShieldCheck } from "lucide-react";
import HeroDemo from "@/components/landing/HeroDemo";
import Ring from "@/components/site/Ring";
import { CTA, Card, Display, Eyebrow, Frame, GITHUB, GhostButton, Lead, PrimaryButton, Section } from "@/components/site/ui";
import { DEPARTMENTS, TOTAL_AGENTS } from "@/lib/departments";

export const metadata: Metadata = {
  title: { absolute: "AutonomOS | The operating system for autonomous companies" },
};

const LOBES = [
  { id: "marketing", pos: "left-1/2 top-0 -translate-x-1/2 -translate-y-[130%]", align: "items-center" },
  { id: "sales", pos: "right-0 top-1/2 translate-x-[calc(100%+12px)] -translate-y-1/2", align: "items-start" },
  { id: "intelligence", pos: "bottom-0 left-1/2 -translate-x-1/2 translate-y-[130%]", align: "items-center" },
  { id: "operations", pos: "left-0 top-1/2 -translate-x-[calc(100%+12px)] -translate-y-1/2", align: "items-end" },
] as const;

const STEPS = [
  { n: "01", title: "Plan", body: "Say what you want in a sentence. The orchestrator turns it into ordered tasks with owners, dependencies and estimates." },
  { n: "02", title: "Delegate", body: "Every task goes to the specialist agent built for it, in the right department, at the right moment." },
  { n: "03", title: "Coordinate", body: "Research lands before content, content before outreach. Hand-offs happen without a meeting." },
  { n: "04", title: "Track", body: "Work moves across a live board. You approve what faces customers and get a report written from real outcomes." },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative px-4 pb-20 pt-14 md:px-8 md:pb-28 md:pt-20">
        <div className="pointer-events-none absolute right-[-10%] top-[-10%] h-[700px] w-[700px] rounded-full bg-ember opacity-[0.10] blur-[140px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <Eyebrow>AI company orchestration platform</Eyebrow>
            <Display as="h1" className="mt-6">
              The operating system for <span className="text-ember">autonomous</span> companies.
            </Display>
            <Lead className="mt-7 max-w-xl">
              AutonomOS plans the work, delegates it to AI agents across marketing, sales, intelligence and operations, and tracks every outcome. You stay in charge of what ships.
            </Lead>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href="/dashboard#command">Try the orchestrator</PrimaryButton>
              <GhostButton href="/product">See how it works</GhostButton>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[12px] text-smoke">
              <span className="flex items-center gap-1.5"><Check size={13} className="text-ember" /> {TOTAL_AGENTS} specialist agents</span>
              <span className="flex items-center gap-1.5"><Check size={13} className="text-ember" /> Free demo mode</span>
              <span className="flex items-center gap-1.5"><Check size={13} className="text-ember" /> Open source</span>
            </div>
          </div>

          <div className="relative mx-auto hidden aspect-square w-full max-w-[440px] sm:block">
            <div className="absolute inset-[14%]">
              <Ring size="100%" lit glow id="hero-ring" className="ring-breathe" title="AutonomOS ring" />
            </div>
            <div className="absolute inset-[14%]">
              {LOBES.map((l) => {
                const d = DEPARTMENTS.find((x) => x.id === l.id)!;
                return (
                  <a key={l.id} href={`/departments/${d.id}`} className={`absolute flex flex-col ${l.align} ${l.pos} group`}>
                    <span className="flex items-center gap-2 rounded-full border border-white/10 bg-coal/80 px-3 py-1.5 backdrop-blur transition-colors group-hover:border-white/25">
                      <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-[13px] font-medium text-paper-white">{d.name}</span>
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Product */}
      <section className="px-4 md:px-8">
        <div className="mx-auto max-w-6xl">
          <Frame url="app.autonomos / command">
            <div className="p-5 md:p-8">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-smoke">orchestrator</p>
              <p className="mb-5 mt-1.5 font-display text-[24px] font-semibold tracking-[-0.03em] md:text-[30px]">What should the company do next?</p>
              <HeroDemo />
            </div>
          </Frame>
        </div>
      </section>

      {/* Built on */}
      <section className="px-4 pt-20 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 border-y border-white/[0.06] py-8 md:flex-row md:justify-between">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-smoke">Built on</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 font-display text-[19px] font-semibold tracking-[-0.03em] text-white/35">
            {["Next.js", "Claude", "Gemini", "Supabase", "Vercel"].map((n) => <span key={n}>{n}</span>)}
          </div>
        </div>
      </section>

      {/* Statement */}
      <Section>
        <p className="max-w-5xl font-display text-[32px] font-medium leading-[1.12] tracking-[-0.04em] text-white/40 sm:text-[44px] lg:text-[56px]">
          Most AI tools hand you an assistant. <span className="text-paper-white">AutonomOS hands you a company:</span> four departments of specialist agents, one orchestrator that runs them, and <span className="text-ember">you</span> at the top, approving what matters.
        </p>
      </Section>

      {/* Departments */}
      <Section id="departments" className="!pt-0">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow>Departments</Eyebrow>
            <Display className="mt-5 max-w-2xl">Four teams. One brief.</Display>
          </div>
          <Lead className="max-w-md">Each department is a squad of agents with its own tools, memory and review step, wired to the orchestrator at the centre.</Lead>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {DEPARTMENTS.map((d, i) => (
            <a key={d.id} href={`/departments/${d.id}`} className="group relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-coal-2 p-7 transition-colors hover:border-white/15 md:p-9">
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 opacity-[0.16] transition-all duration-500 group-hover:rotate-12 group-hover:opacity-30">
                <Ring size="100%" color={d.color} />
              </div>
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] text-smoke">0{i + 1}</span>
                  <span className="rounded-full border px-3 py-1 font-mono text-[11px]" style={{ color: d.color, borderColor: `${d.color}40` }}>
                    {d.id === "marketing" ? 10 : d.agents.length} agents
                  </span>
                </div>
                <h3 className="mt-14 font-display text-[40px] font-semibold tracking-[-0.045em] md:text-[48px]">{d.name}</h3>
                <p className="mt-1 text-[16px] text-ash">{d.blurb}</p>
                <ul className="mt-7 flex flex-wrap gap-2">
                  {d.agents.map((a) => (
                    <li key={a.id} className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[13px] text-paper-white/85">{a.name}</li>
                  ))}
                </ul>
                <span className="mt-8 inline-flex items-center gap-1.5 text-[14px] font-semibold text-paper-white">
                  Explore {d.name.toLowerCase()} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section id="how" className="border-t border-white/[0.06]">
        <Eyebrow>How it works</Eyebrow>
        <Display className="mt-5 max-w-3xl">From a sentence to shipped work.</Display>
        <div className="mt-16 grid gap-px overflow-hidden rounded-[26px] border border-white/[0.07] bg-white/[0.07] md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative bg-coal p-7 md:p-8">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] text-ember">{s.n}</span>
                <span className="h-2 w-2 rounded-full" style={{ background: DEPARTMENTS[i].color }} />
              </div>
              <h3 className="mt-16 font-display text-[30px] font-semibold tracking-[-0.04em]">{s.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ash">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Control, on paper */}
      <section className="bg-paper-white px-4 py-24 text-coal md:px-8 md:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.16em] text-[#6f6a64]">
              <span className="h-1.5 w-1.5 rounded-full bg-ember" /> Control
            </p>
            <h2 className="mt-5 font-display text-[36px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[48px] lg:text-[60px]">
              Autonomous. Never unsupervised.
            </h2>
            <p className="mt-6 max-w-lg text-[18px] leading-relaxed text-[#55504a]">
              Agents draft, research and prepare. Anything that reaches a customer, a post, an email, a proposal, waits for a human yes.
            </p>
            <ul className="mt-9 space-y-4">
              {[
                "Approval queue for every customer-facing draft",
                "Free demo mode: templates and sample data, no model spend",
                "Bring Claude or Gemini behind one switch when you are ready",
                "Every agent, prompt and template is readable source",
              ].map((x) => (
                <li key={x} className="flex items-start gap-3 text-[16px]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coal text-paper-white"><Check size={12} /></span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[28px] bg-coal p-6 text-paper-white shadow-[0_40px_100px_-40px_rgba(18,17,16,0.6)] md:p-8">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-smoke">Needs approval</p>
              <span className="rounded-full bg-ember/15 px-2.5 py-1 font-mono text-[11px] text-ember-soft">3 waiting</span>
            </div>
            {[
              { t: "Launch post: \"Pricing that grows with you\"", d: "Marketing", a: "Content Writer", c: "#f28c5b" },
              { t: "4-step sequence for Copperleaf Health", d: "Sales", a: "Outreach Writer", c: "#4fb286" },
              { t: "Counter-angle post on Relaykit's launch", d: "Marketing", a: "Trend Rider", c: "#f28c5b" },
            ].map((x, i) => (
              <div key={x.t} className={`mt-4 rounded-2xl border p-4 ${i === 0 ? "border-ember/40 bg-ember/[0.06]" : "border-white/[0.07] bg-white/[0.02]"}`}>
                <div className="flex items-start gap-3">
                  <Eye size={16} className="mt-0.5 shrink-0 text-ops" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{x.t}</p>
                    <p className="mt-1 flex items-center gap-2 text-[12.5px] text-ash">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: x.c }} /> {x.d} · {x.a}
                    </p>
                  </div>
                </div>
                {i === 0 && (
                  <div className="mt-4 flex gap-2 pl-7">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-white px-3.5 py-1.5 text-[13px] font-semibold text-coal"><ShieldCheck size={14} /> Approve</span>
                    <span className="rounded-full border border-white/12 px-3.5 py-1.5 text-[13px] text-ash">Edit</span>
                    <span className="rounded-full px-3.5 py-1.5 text-[13px] text-smoke">Discard</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Numbers */}
      <Section>
        <div className="grid grid-cols-2 gap-y-12 md:grid-cols-4">
          {[
            [String(TOTAL_AGENTS), "specialist agents"],
            ["4", "departments, one orchestrator"],
            ["$0", "to run the full demo"],
            ["100%", "of customer-facing work approved"],
          ].map(([v, l]) => (
            <div key={l} className="border-l border-white/[0.08] pl-6">
              <p className="font-display text-[56px] font-semibold leading-none tracking-[-0.06em] md:text-[76px]">{v}</p>
              <p className="mt-3 max-w-[180px] text-[14px] text-ash">{l}</p>
            </div>
          ))}
        </div>
        <p className="mt-12 text-[13px] text-smoke">
          Open source on <a href={GITHUB} className="underline decoration-white/20 underline-offset-4 hover:text-paper-white">GitHub</a>. Read every prompt, fork every agent.
        </p>
      </Section>

      <CTA />
    </>
  );
}
