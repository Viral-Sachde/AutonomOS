"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Mail, Plus, Search } from "lucide-react";
import { Button, DeptHeader, Panel, Stat, ago, inputClass, money } from "./dept-ui";
import { useLocalState } from "./useLocalState";
import { DEAL_STAGES, SEED_DEALS, type Deal, type DealStage } from "@/lib/demo-data";
import type { Lead, SequenceStep } from "@/lib/departments";

const GREEN = "#4fb286";

async function runAgent<T>(agent: string, input: Record<string, string>): Promise<T> {
  const res = await fetch("/api/departments/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agent, input }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Agent failed");
  return data.result as T;
}

export default function SalesPanel() {
  const [deals, setDeals] = useLocalState<Deal[]>("deals", SEED_DEALS);
  const [icp, setIcp] = useState("Series A to C B2B SaaS, 20 to 200 people, growing a sales team");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [prospecting, setProspecting] = useState(false);
  const [seqDeal, setSeqDeal] = useState<string>(SEED_DEALS[2].id);
  const [sequence, setSequence] = useState<SequenceStep[]>([]);
  const [writing, setWriting] = useState(false);
  const [openStep, setOpenStep] = useState(0);

  const open = deals.filter((d) => d.stage !== "won");
  const won = deals.filter((d) => d.stage === "won");
  const pipeline = open.reduce((n, d) => n + d.value, 0);
  const meetings = deals.filter((d) => d.stage === "meeting" || d.stage === "proposal").length;

  const move = (id: string, dir: -1 | 1) =>
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const i = DEAL_STAGES.findIndex((s) => s.id === d.stage);
        const next = DEAL_STAGES[Math.max(0, Math.min(DEAL_STAGES.length - 1, i + dir))].id as DealStage;
        return { ...d, stage: next, updatedAt: new Date().toISOString() };
      }),
    );

  async function prospect() {
    setProspecting(true);
    try {
      const r = await runAgent<{ leads: Lead[] }>("sales.prospector", { icp });
      setLeads(r.leads);
    } finally {
      setProspecting(false);
    }
  }

  function addLead(l: Lead) {
    setDeals((prev) => [
      { id: `deal-${l.id}`, company: l.company, contact: l.contact, value: 4000 + Math.round(l.fit * 220), stage: "lead", owner: "Prospector", nextStep: "First touch from Outreach Writer", updatedAt: new Date().toISOString() },
      ...prev,
    ]);
    setLeads((prev) => prev.filter((x) => x.id !== l.id));
  }

  async function writeSequence() {
    const d = deals.find((x) => x.id === seqDeal);
    if (!d) return;
    setWriting(true);
    try {
      const r = await runAgent<{ steps: SequenceStep[] }>("sales.outreach", { company: d.company, contact: d.contact, offer: "AutonomOS" });
      setSequence(r.steps);
      setOpenStep(0);
    } finally {
      setWriting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <DeptHeader id="sales" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="open pipeline" value={money(pipeline)} hint={`${open.length} deals`} color={GREEN} />
        <Stat label="closed won" value={money(won.reduce((n, d) => n + d.value, 0))} hint={`${won.length} this month`} />
        <Stat label="meetings & proposals" value={String(meetings)} hint="booked by agents" />
        <Stat label="reply rate" value="18.4%" hint="last 30 days, demo" />
      </div>

      <Panel title="pipeline">
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-thin">
          {DEAL_STAGES.map((stage) => {
            const list = deals.filter((d) => d.stage === stage.id);
            return (
              <div key={stage.id} className="w-60 shrink-0 rounded-xl border border-gold/10 bg-ink-black/40 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-champagne">{stage.label}</span>
                  <span className="font-mono text-[11px] text-cool-steel">{money(list.reduce((n, d) => n + d.value, 0))}</span>
                </div>
                <div className="space-y-2">
                  {list.map((d) => (
                    <div key={d.id} className="rise rounded-lg border border-gold/10 bg-twilight-indigo/60 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-medium text-champagne">{d.company}</span>
                        <span className="font-mono text-[11px]" style={{ color: GREEN }}>{money(d.value)}</span>
                      </div>
                      <p className="text-[11px] text-cool-steel">{d.contact}</p>
                      <p className="mt-2 text-[11px] leading-snug text-champagne/80">{d.nextStep}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-cool-steel">{d.owner} · {ago(d.updatedAt)}</span>
                        <span className="flex gap-1">
                          <button aria-label="Move back" onClick={() => move(d.id, -1)} className="rounded p-0.5 text-cool-steel hover:bg-gold/10 hover:text-champagne"><ChevronLeft size={14} /></button>
                          <button aria-label="Move forward" onClick={() => move(d.id, 1)} className="rounded p-0.5 text-cool-steel hover:bg-gold/10 hover:text-champagne"><ChevronRight size={14} /></button>
                        </span>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && <p className="py-4 text-center text-[12px] text-cool-steel/70">empty</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="prospector">
          <label className="mb-1.5 block text-[12px] text-cool-steel">Ideal customer profile</label>
          <textarea value={icp} onChange={(e) => setIcp(e.target.value)} rows={2} className={inputClass} />
          <div className="mt-3">
            <Button onClick={prospect} disabled={prospecting || !icp.trim()}>
              {prospecting ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Find leads
            </Button>
          </div>
          <ul className="mt-4 space-y-2">
            {leads.map((l) => (
              <li key={l.id} className="rise flex items-center gap-3 rounded-xl border border-gold/10 bg-ink-black/40 p-3">
                <div className="relative h-10 w-10 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity=".1" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke={GREEN} strokeWidth="3" strokeDasharray={`${(l.fit / 100) * 94} 94`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-champagne">{l.fit}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-champagne">{l.company}</p>
                  <p className="text-[11px] text-cool-steel">{l.contact}, {l.title}</p>
                  <p className="text-[11px] text-champagne/70">{l.reason}</p>
                </div>
                <button onClick={() => addLead(l)} className="inline-flex items-center gap-1 rounded-lg border border-gold/20 px-2 py-1 text-[11px] text-champagne hover:bg-gold/10">
                  <Plus size={12} /> Pipeline
                </button>
              </li>
            ))}
            {leads.length === 0 && <p className="text-[12px] text-cool-steel/80">Run the Prospector to get a fresh list of fictional demo accounts.</p>}
          </ul>
        </Panel>

        <Panel title="outreach writer">
          <label className="mb-1.5 block text-[12px] text-cool-steel">Write a sequence for</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={seqDeal} onChange={(e) => setSeqDeal(e.target.value)} className={inputClass}>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>{d.company}: {d.contact}</option>
              ))}
            </select>
            <Button onClick={writeSequence} disabled={writing}>
              {writing ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Write
            </Button>
          </div>
          <ol className="mt-4 space-y-2">
            {sequence.map((s, i) => (
              <li key={i} className="rise rounded-xl border border-gold/10 bg-ink-black/40">
                <button onClick={() => setOpenStep(openStep === i ? -1 : i)} className="flex w-full items-center gap-3 p-3 text-left">
                  <span className="rounded-md px-2 py-0.5 font-mono text-[10px]" style={{ background: `${GREEN}22`, color: GREEN }}>day {s.day}</span>
                  <span className="text-[13px] text-champagne">{s.subject}</span>
                </button>
                {openStep === i && <p className="whitespace-pre-line border-t border-gold/10 p-3 text-[12px] leading-relaxed text-champagne/85">{s.body}</p>}
              </li>
            ))}
            {sequence.length === 0 && <p className="text-[12px] text-cool-steel/80">Pick a deal and the Outreach Writer drafts a four-step sequence for approval.</p>}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
