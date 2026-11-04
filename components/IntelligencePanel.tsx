"use client";

import { useState } from "react";
import { Loader2, Radar, RefreshCw, Trash2 } from "lucide-react";
import { Button, DeptHeader, Panel, Stat, ago, inputClass } from "./dept-ui";
import { useLocalState } from "./useLocalState";
import { SEED_COMPETITORS, SEED_SCORED_LEADS, SEED_SIGNALS, type Signal } from "@/lib/demo-data";
import type { CompetitorBrief } from "@/lib/departments";

const BLUE = "#7a9cf5";
const THREAT: Record<CompetitorBrief["threat"], string> = { low: "#4fb286", medium: "#e9b949", high: "#ff6b5e" };
const SIGNAL_LABEL: Record<Signal["kind"], string> = { launch: "launch", funding: "funding", hiring: "hiring", pricing: "pricing", mention: "mention" };

async function scan(name: string): Promise<CompetitorBrief> {
  const res = await fetch("/api/departments/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agent: "intel.competitor", input: { name } }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Scan failed");
  return data.result.brief;
}

export default function IntelligencePanel() {
  const [competitors, setCompetitors] = useLocalState<CompetitorBrief[]>("competitors", SEED_COMPETITORS);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<Signal["kind"] | "all">("all");

  const signals = SEED_SIGNALS.filter((s) => filter === "all" || s.kind === filter);

  async function add() {
    const n = name.trim();
    if (!n) return;
    setBusy("new");
    try {
      const brief = await scan(n);
      setCompetitors((prev) => [brief, ...prev.filter((c) => c.name.toLowerCase() !== n.toLowerCase())]);
      setName("");
    } finally {
      setBusy(null);
    }
  }

  async function refresh(c: CompetitorBrief) {
    setBusy(c.id);
    try {
      const brief = await scan(c.name);
      setCompetitors((prev) => prev.map((x) => (x.id === c.id ? { ...brief, id: c.id } : x)));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <DeptHeader id="intelligence" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="rivals tracked" value={String(competitors.length)} color={BLUE} />
        <Stat label="high threat" value={String(competitors.filter((c) => c.threat === "high").length)} hint="needs a response" />
        <Stat label="signals this week" value={String(SEED_SIGNALS.length)} hint="across 5 sources" />
        <Stat label="avg lead score" value={String(Math.round(SEED_SCORED_LEADS.reduce((n, l) => n + l.fit, 0) / SEED_SCORED_LEADS.length))} hint="fit and intent" />
      </div>

      <Panel
        title="competitor watch"
        action={
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a competitor" className={`${inputClass} !w-44 !py-1.5`} />
            <Button type="submit" disabled={busy === "new" || !name.trim()}>
              {busy === "new" ? <Loader2 size={14} className="animate-spin" /> : <Radar size={14} />} Scan
            </Button>
          </form>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          {competitors.map((c) => (
            <article key={c.id} className="rise flex flex-col rounded-xl border border-gold/10 bg-ink-black/40 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl text-champagne">{c.name}</h3>
                <span className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase" style={{ color: THREAT[c.threat], background: `${THREAT[c.threat]}1f` }}>
                  {c.threat} threat
                </span>
              </div>
              <p className="mt-1 text-[12px] text-cool-steel">{c.positioning}</p>
              <p className="mt-2 font-mono text-[11px] text-champagne/80">{c.pricing}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <p className="mb-1 font-mono uppercase tracking-wider text-emerald">strengths</p>
                  <ul className="space-y-0.5 text-champagne/80">{c.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
                </div>
                <div>
                  <p className="mb-1 font-mono uppercase tracking-wider text-strawberry-red">gaps</p>
                  <ul className="space-y-0.5 text-champagne/80">{c.weaknesses.map((s) => <li key={s}>{s}</li>)}</ul>
                </div>
              </div>
              <div className="mt-3 border-t border-gold/10 pt-3">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-cool-steel">recent moves</p>
                <ul className="space-y-1 text-[12px] text-champagne">{c.moves.map((m) => <li key={m}>• {m}</li>)}</ul>
              </div>
              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="font-mono text-[10px] text-cool-steel">updated {ago(c.updatedAt)}</span>
                <span className="flex gap-1">
                  <button aria-label="Refresh brief" onClick={() => refresh(c)} className="rounded p-1 text-cool-steel hover:bg-gold/10 hover:text-champagne">
                    {busy === c.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  </button>
                  <button aria-label="Stop tracking" onClick={() => setCompetitors((p) => p.filter((x) => x.id !== c.id))} className="rounded p-1 text-cool-steel hover:bg-gold/10 hover:text-strawberry-red">
                    <Trash2 size={14} />
                  </button>
                </span>
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel
          title="market radar"
          action={
            <div className="flex flex-wrap gap-1">
              {(["all", "launch", "funding", "hiring", "pricing", "mention"] as const).map((k) => (
                <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-2.5 py-0.5 text-[11px] ${filter === k ? "bg-champagne text-ink-black" : "text-cool-steel hover:text-champagne"}`}>
                  {k}
                </button>
              ))}
            </div>
          }
        >
          <ul className="divide-y divide-gold/10">
            {signals.map((s) => (
              <li key={s.id} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 w-16 shrink-0 rounded-md px-1.5 py-0.5 text-center font-mono text-[10px] uppercase" style={{ background: `${BLUE}1f`, color: BLUE }}>
                  {SIGNAL_LABEL[s.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-champagne">{s.title}</p>
                  <p className="font-mono text-[10px] text-cool-steel">{s.source} · {ago(s.at)}</p>
                </div>
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${s.sentiment === "positive" ? "bg-emerald" : s.sentiment === "negative" ? "bg-strawberry-red" : "bg-cool-steel"}`} title={s.sentiment} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="lead scorer">
          <ul className="space-y-3">
            {SEED_SCORED_LEADS.map((l, i) => (
              <li key={l.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] text-champagne"><span className="mr-2 font-mono text-cool-steel">{i + 1}</span>{l.company}</span>
                  <span className="font-mono text-[12px]" style={{ color: BLUE }}>{l.fit}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-black/70">
                  <div className="h-full rounded-full" style={{ width: `${l.fit}%`, background: `linear-gradient(90deg, ${BLUE}, #e0584c)` }} />
                </div>
                <p className="mt-1 text-[11px] text-cool-steel">{l.contact}, {l.title}. {l.reason}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
