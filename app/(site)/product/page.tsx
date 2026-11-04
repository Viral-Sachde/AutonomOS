import type { Metadata } from "next";
import { BrainCircuit, CalendarClock, CircleDollarSign, Eye, GitBranch, History, Layers, Loader2, CheckCircle2, CircleDashed, ShieldCheck, Workflow } from "lucide-react";
import OrchestratorGraph from "@/components/OrchestratorGraph";
import { CTA, Card, Display, Eyebrow, Frame, Lead, PrimaryButton, GhostButton, Section } from "@/components/site/ui";
import { DEPARTMENTS } from "@/lib/departments";

export const metadata: Metadata = {
  title: "Product",
  description: "How the AutonomOS orchestrator plans, delegates, coordinates and tracks work across four departments of AI agents.",
};

const color = (id: string) => DEPARTMENTS.find((d) => d.id === id)!.color;

const PLAN = [
  { t: "Scan the market around the goal", d: "intelligence", a: "Market Radar", s: "done", eta: 8 },
  { t: "Refresh competitor briefs", d: "intelligence", a: "Competitor Watch", s: "done", eta: 12 },
  { t: "Pick angles that are working now", d: "marketing", a: "Trend Rider", s: "running", eta: 6 },
  { t: "Build a target lead list", d: "sales", a: "Prospector", s: "running", eta: 14 },
  { t: "Draft the campaign content", d: "marketing", a: "Content Writer", s: "queued", eta: 15 },
  { t: "Report outcomes on Friday", d: "operations", a: "Reporter", s: "queued", eta: 6 },
];

const FEATURES = [
  { icon: ShieldCheck, t: "Approval before anything ships", b: "Posts, emails and proposals stop in a review state. Approve, edit or discard." },
  { icon: CircleDollarSign, t: "Free demo mode", b: "Every agent has a template path and seeded sample data. Explore the whole platform with no model spend." },
  { icon: BrainCircuit, t: "Model agnostic", b: "Claude or Gemini behind one environment variable. No agent code changes." },
  { icon: History, t: "Memory against repetition", b: "Shared usage history stops agents repeating an angle, a hook or a lead." },
  { icon: CalendarClock, t: "Scheduled, not babysat", b: "Agents wake on a schedule, pick up due work and publish approved content in peak windows." },
  { icon: GitBranch, t: "Readable source", b: "One Next.js app in TypeScript. Every prompt and template is in the repo." },
];

export default function ProductPage() {
  return (
    <>
      <Section className="!pb-16 !pt-20">
        <Eyebrow>Product</Eyebrow>
        <Display as="h1" className="mt-6 max-w-5xl">One orchestrator. Every department. No busywork.</Display>
        <Lead className="mt-7 max-w-2xl">
          AutonomOS is an orchestration layer for AI agents. It turns a goal into a plan, hands each task to the right specialist, keeps the hand-offs in order and shows you the outcome.
        </Lead>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <PrimaryButton href="/dashboard#command">Try it in demo mode</PrimaryButton>
          <GhostButton href="/pricing">See pricing</GhostButton>
        </div>
      </Section>

      {/* Plan */}
      <Section className="border-t border-white/[0.06]">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="font-mono text-[12px] text-ember">01 / Plan</p>
            <Display className="mt-4">A sentence in. A plan out.</Display>
            <Lead className="mt-5">
              Write the goal the way you would say it to a team lead. The orchestrator breaks it into five to ten tasks, names an owner for each, orders them by dependency and estimates the time.
            </Lead>
          </div>
          <Frame url="app.autonomos / command">
            <div className="p-5 md:p-6">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px]">Launch the new pricing page and book 20 demos</div>
              <ol className="mt-4 space-y-2">
                {PLAN.map((p) => (
                  <li key={p.t} className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${p.s === "running" ? "border-ember/35 bg-ember/[0.05]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                    {p.s === "done" ? <CheckCircle2 size={16} className="shrink-0 text-sales" /> : p.s === "running" ? <Loader2 size={16} className="shrink-0 animate-spin text-ember" /> : <CircleDashed size={16} className="shrink-0 text-smoke" />}
                    <span className="min-w-0 flex-1 truncate text-[13.5px]">{p.t}</span>
                    <span className="hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] sm:inline" style={{ color: color(p.d), background: `${color(p.d)}1a` }}>{p.a}</span>
                    <span className="hidden shrink-0 font-mono text-[11px] text-smoke md:inline">~{p.eta}m</span>
                  </li>
                ))}
              </ol>
            </div>
          </Frame>
        </div>
      </Section>

      {/* Delegate & coordinate */}
      <Section className="border-t border-white/[0.06]">
        <div className="grid items-center gap-14 lg:grid-cols-[1.2fr_1fr]">
          <Card className="order-2 flex justify-center p-8 text-paper-white lg:order-1">
            <OrchestratorGraph active={["intelligence", "marketing", "sales"]} counts={{ marketing: 3, sales: 2, intelligence: 2, operations: 1 }} size={380} />
          </Card>
          <div className="order-1 lg:order-2">
            <p className="font-mono text-[12px] text-ember">02 / Delegate · 03 / Coordinate</p>
            <Display className="mt-4">The right agent, at the right moment.</Display>
            <Lead className="mt-5">
              Research runs before content. Content runs before outreach. The orchestrator only releases a task once the work it depends on is finished, so agents never act on stale or missing input.
            </Lead>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {DEPARTMENTS.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-coal-2 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-[14px]">{d.name}</span>
                  <span className="ml-auto font-mono text-[11px] text-smoke">{d.id === "marketing" ? 10 : d.agents.length}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Track */}
      <Section className="border-t border-white/[0.06]">
        <div className="max-w-3xl">
          <p className="font-mono text-[12px] text-ember">04 / Track</p>
          <Display className="mt-4">See everything. Approve what matters.</Display>
          <Lead className="mt-5">Every task lands on a shared board. Drafts that face customers wait for a yes. On Friday, the Reporter writes the week from what actually happened.</Lead>
        </div>
        <div className="mt-12 grid gap-3 md:grid-cols-4">
          {[
            { h: "Queued", items: [["Write follow-ups for open proposals", "sales"], ["Weekly report", "operations"]] },
            { h: "Running", items: [["Prospect 25 accounts in health tech", "sales"]] },
            { h: "Needs approval", items: [["Three posts for launch week", "marketing"]] },
            { h: "Done", items: [["Refresh competitor briefs", "intelligence"], ["Scan the market", "intelligence"]] },
          ].map((col) => (
            <Card key={col.h} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[14px] font-medium">{col.h}</span>
                <span className="rounded-full bg-white/[0.05] px-2 font-mono text-[11px] text-smoke">{col.items.length}</span>
              </div>
              <div className="space-y-2">
                {col.items.map(([t, d]) => (
                  <div key={t} className="rounded-xl border border-white/[0.06] bg-coal p-3">
                    <p className="text-[13px] leading-snug">{t}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: color(d) }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color(d) }} /> {DEPARTMENTS.find((x) => x.id === d)!.name}
                    </p>
                    {col.h === "Needs approval" && <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-ops"><Eye size={12} /> waiting on you</p>}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Features */}
      <Section className="border-t border-white/[0.06]">
        <Eyebrow>Built for operators</Eyebrow>
        <Display className="mt-5 max-w-3xl">Everything you need to trust a company of agents.</Display>
        <div className="mt-14 grid gap-px overflow-hidden rounded-[26px] border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.t} className="bg-coal p-8">
              <f.icon size={22} className="text-ember" strokeWidth={1.6} />
              <h3 className="mt-6 font-display text-[22px] font-semibold tracking-[-0.03em]">{f.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ash">{f.b}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Workflows */}
      <Section className="border-t border-white/[0.06]">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <Eyebrow>Workflows</Eyebrow>
            <Display className="mt-5">Repeatable work, on triggers.</Display>
            <Lead className="mt-5">Turn the plays you run every week into workflows that start themselves: a new lead, a competitor move, Friday at five.</Lead>
          </div>
          <div className="space-y-3">
            {[
              { n: "New lead to first touch", tr: "Lead added to pipeline", s: [["Score", "intelligence"], ["Draft email", "sales"], ["Assign owner", "operations"]] },
              { n: "Competitor move to counter-post", tr: "Signal: competitor launch", s: [["Brief", "intelligence"], ["Counter angle", "marketing"], ["Queue post", "marketing"]] },
              { n: "Friday operating report", tr: "Every Friday, 17:00", s: [["Collect outcomes", "operations"], ["Write report", "operations"]] },
            ].map((w) => (
              <Card key={w.n} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[16px] font-medium">{w.n}</p>
                  <p className="flex items-center gap-1.5 font-mono text-[11px] text-smoke"><Workflow size={12} /> {w.tr}</p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {w.s.map(([l, d], i) => (
                    <span key={l} className="flex items-center gap-2">
                      <span className="rounded-full border px-3 py-1 text-[12.5px]" style={{ color: color(d), borderColor: `${color(d)}40`, background: `${color(d)}10` }}>{l}</span>
                      {i < w.s.length - 1 && <Layers size={12} className="text-smoke" />}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      <CTA />
    </>
  );
}
