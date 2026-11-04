import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Workflow } from "lucide-react";
import Ring from "@/components/site/Ring";
import { CTA, Card, Display, Eyebrow, Lead, PrimaryButton, Section } from "@/components/site/ui";
import { DEPARTMENTS, type DeptId } from "@/lib/departments";
import { SEED_COMPETITORS, SEED_DEALS, SEED_SCORED_LEADS, SEED_SIGNALS, SEED_TASKS, SEED_WORKFLOWS } from "@/lib/demo-data";

export function generateStaticParams() {
  return DEPARTMENTS.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const d = DEPARTMENTS.find((x) => x.id === id);
  return d ? { title: d.name, description: `${d.name} in AutonomOS: ${d.blurb.toLowerCase()}, run by specialist AI agents.` } : {};
}

const COPY: Record<DeptId, { headline: string; lead: string; outcomes: [string, string][] }> = {
  marketing: {
    headline: "A content team that never misses a slot.",
    lead: "Ten agents research what is working, write in your voice, render on-brand artwork, plan the calendar and publish only what you approve.",
    outcomes: [["Daily", "posts, stories and reel scripts"], ["10", "agents across research, writing and design"], ["0", "posts published without approval"]],
  },
  sales: {
    headline: "Pipeline that builds itself, politely.",
    lead: "Prospect against your ideal customer, write sequences that sound like a person, coach every open deal and keep the CRM honest.",
    outcomes: [["25", "qualified accounts per prospecting run"], ["4-step", "personalised sequences per lead"], ["1", "next best action for every deal"]],
  },
  intelligence: {
    headline: "Know the market before the meeting.",
    lead: "Competitor briefs that refresh themselves, a radar for launches, funding and hiring, and a lead score that blends fit with intent.",
    outcomes: [["Weekly", "competitor brief refresh"], ["5", "signal types tracked"], ["0 to 100", "lead score on fit and intent"]],
  },
  operations: {
    headline: "The connective tissue of the company.",
    lead: "Turn plans into owned tasks, run repeatable workflows on triggers, flag stuck work early and write the weekly report from real outcomes.",
    outcomes: [["Live", "task board across every department"], ["4", "workflow templates included"], ["Friday", "report written for you"]],
  },
};

function Showcase({ id, color }: { id: DeptId; color: string }) {
  if (id === "sales") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {SEED_DEALS.slice(0, 4).map((d) => (
          <Card key={d.id} className="p-5">
            <div className="flex items-start justify-between">
              <p className="text-[15px] font-medium">{d.company}</p>
              <p className="font-mono text-[13px]" style={{ color }}>${(d.value / 1000).toFixed(1)}k</p>
            </div>
            <p className="text-[13px] text-ash">{d.contact}</p>
            <p className="mt-4 rounded-lg bg-white/[0.03] px-3 py-2 text-[13px] text-paper-white/85">{d.nextStep}</p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-smoke">{d.stage} · {d.owner}</p>
          </Card>
        ))}
      </div>
    );
  }
  if (id === "intelligence") {
    return (
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          {SEED_COMPETITORS.slice(0, 2).map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-[22px] font-semibold tracking-[-0.03em]">{c.name}</p>
                <span className="rounded-full bg-ember/15 px-2.5 py-0.5 font-mono text-[11px] uppercase text-ember-soft">{c.threat} threat</span>
              </div>
              <p className="mt-1 text-[13.5px] text-ash">{c.positioning}</p>
              <p className="mt-3 text-[13px]">Recent: {c.moves[0]}</p>
            </Card>
          ))}
        </div>
        <Card className="p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-smoke">Lead score</p>
          <ul className="mt-4 space-y-3.5">
            {SEED_SCORED_LEADS.slice(0, 4).map((l) => (
              <li key={l.id}>
                <div className="flex justify-between text-[13.5px]"><span>{l.company}</span><span className="font-mono" style={{ color }}>{l.fit}</span></div>
                <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.06]"><div className="h-full rounded-full" style={{ width: `${l.fit}%`, background: color }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-smoke">Latest signal</p>
          <p className="mt-2 text-[13.5px]">{SEED_SIGNALS[1].title}</p>
        </Card>
      </div>
    );
  }
  if (id === "operations") {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {(["running", "review", "done"] as const).map((st) => (
          <Card key={st} className="p-4">
            <p className="mb-3 text-[14px] font-medium capitalize">{st === "review" ? "Needs approval" : st}</p>
            {SEED_TASKS.filter((t) => t.status === st).map((t) => {
              const dc = DEPARTMENTS.find((d) => d.id === t.dept)!;
              return (
                <div key={t.id} className="mb-2 rounded-xl border border-white/[0.06] bg-coal p-3">
                  <p className="text-[13px]">{t.title}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: dc.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: dc.color }} />{dc.name}</p>
                </div>
              );
            })}
          </Card>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {[
        { k: "Post", h: "Pricing that grows with you", b: "Three plans, no seat tax, and a free demo mode. Swipe for the side by side." },
        { k: "Story", h: "What our agents shipped this week", b: "5 frames: plan, research, draft, approve, publish." },
        { k: "Reel script", h: "One sentence, four departments", b: "0:00 type a goal. 0:04 watch the plan appear. 0:12 approve the first draft." },
      ].map((x) => (
        <Card key={x.h} className="overflow-hidden">
          <div className="flex aspect-[4/3] items-end p-5" style={{ background: `linear-gradient(160deg, ${color}33, transparent 70%)` }}>
            <p className="font-display text-[24px] font-semibold leading-tight tracking-[-0.03em]">{x.h}</p>
          </div>
          <div className="p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color }}>{x.k}</p>
            <p className="mt-2 text-[13.5px] text-ash">{x.b}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default async function DepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const index = DEPARTMENTS.findIndex((x) => x.id === id);
  if (index < 0) notFound();
  const d = DEPARTMENTS[index];
  const copy = COPY[d.id];
  const prev = DEPARTMENTS[(index + DEPARTMENTS.length - 1) % DEPARTMENTS.length];
  const next = DEPARTMENTS[(index + 1) % DEPARTMENTS.length];
  const flows = SEED_WORKFLOWS.filter((w) => w.steps.some((s) => s.dept === d.id));

  return (
    <>
      <section className="relative overflow-hidden px-4 pb-20 pt-16 md:px-8 md:pb-28 md:pt-24">
        <div className="pointer-events-none absolute -right-40 top-0 h-[640px] w-[640px] rounded-full opacity-[0.12] blur-[120px]" style={{ background: d.color }} />
        <div className="pointer-events-none absolute -right-24 top-16 hidden h-[460px] w-[460px] opacity-90 md:block">
          <Ring size="100%" color={d.color} className="ring-breathe" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map((x) => (
              <a key={x.id} href={`/departments/${x.id}`} className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${x.id === d.id ? "border-white/25 bg-white/[0.06] text-paper-white" : "border-white/[0.08] text-ash hover:text-paper-white"}`}>
                <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full" style={{ background: x.color }} />
                {x.name}
              </a>
            ))}
          </div>
          <div className="mt-14 max-w-3xl">
            <Eyebrow color={d.color}>{d.name} · {d.blurb}</Eyebrow>
            <Display as="h1" className="mt-6">{copy.headline}</Display>
            <Lead className="mt-7 max-w-2xl">{copy.lead}</Lead>
            <div className="mt-10"><PrimaryButton href={`/dashboard#${d.id === "marketing" ? "agents" : d.id}`}>Open {d.name.toLowerCase()}</PrimaryButton></div>
          </div>
          <div className="mt-20 grid gap-8 border-t border-white/[0.07] pt-10 sm:grid-cols-3">
            {copy.outcomes.map(([v, l]) => (
              <div key={l}>
                <p className="font-display text-[44px] font-semibold leading-none tracking-[-0.05em]" style={{ color: d.color }}>{v}</p>
                <p className="mt-2 text-[14px] text-ash">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section className="border-t border-white/[0.06]">
        <Eyebrow color={d.color}>The team</Eyebrow>
        <Display className="mt-5 max-w-3xl">Specialists, not generalists.</Display>
        <div className="mt-12 grid gap-px overflow-hidden rounded-[26px] border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-4">
          {d.agents.map((a, i) => (
            <div key={a.id} className="bg-coal p-7">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px]" style={{ color: d.color }}>0{i + 1}</span>
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ background: d.color }} /><span className="relative h-2 w-2 rounded-full" style={{ background: d.color }} /></span>
              </div>
              <h3 className="mt-12 font-display text-[24px] font-semibold tracking-[-0.035em]">{a.name}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ash">{a.role}</p>
              <p className="mt-5 font-mono text-[11px] text-smoke">{a.id}</p>
            </div>
          ))}
        </div>
        {d.id === "marketing" && <p className="mt-4 text-[13px] text-smoke">Plus six more: hashtag strategist, story generator, analytics reporter, competitor scout and two product polishers.</p>}
      </Section>

      <Section className="border-t border-white/[0.06]">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Eyebrow color={d.color}>What it produces</Eyebrow>
            <Display className="mt-5">Real work, ready for review.</Display>
          </div>
          <p className="max-w-sm text-[13px] text-smoke">Shown with the sample data that ships in demo mode. Every company and person is fictional.</p>
        </div>
        <div className="mt-12"><Showcase id={d.id} color={d.color} /></div>
      </Section>

      {flows.length > 0 && (
        <Section className="border-t border-white/[0.06]">
          <Eyebrow color={d.color}>Plays</Eyebrow>
          <Display className="mt-5">Workflows this team joins.</Display>
          <div className="mt-12 grid gap-3 md:grid-cols-2">
            {flows.map((w) => (
              <Card key={w.id} className="p-6">
                <p className="text-[17px] font-medium">{w.name}</p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-[11.5px] text-smoke"><Workflow size={12} /> {w.trigger}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {w.steps.map((s, i) => {
                    const c = DEPARTMENTS.find((x) => x.id === s.dept)!.color;
                    return (
                      <span key={i} className="flex items-center gap-2">
                        <span className="rounded-full border px-3 py-1 text-[12.5px]" style={{ color: c, borderColor: `${c}40`, background: `${c}10` }}>{s.label}</span>
                        {i < w.steps.length - 1 && <ArrowRight size={12} className="text-smoke" />}
                      </span>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <section className="px-4 pb-6 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2">
          <a href={`/departments/${prev.id}`} className="group rounded-[22px] border border-white/[0.07] p-6 transition-colors hover:border-white/15">
            <p className="flex items-center gap-1.5 font-mono text-[11.5px] text-smoke"><ArrowLeft size={13} /> Previous</p>
            <p className="mt-3 font-display text-[28px] font-semibold tracking-[-0.04em]">{prev.name}</p>
          </a>
          <a href={`/departments/${next.id}`} className="group rounded-[22px] border border-white/[0.07] p-6 text-right transition-colors hover:border-white/15">
            <p className="flex items-center justify-end gap-1.5 font-mono text-[11.5px] text-smoke">Next <ArrowRight size={13} /></p>
            <p className="mt-3 font-display text-[28px] font-semibold tracking-[-0.04em]">{next.name}</p>
          </a>
        </div>
      </section>

      <CTA />
    </>
  );
}
