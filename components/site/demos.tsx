"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, CircleDashed, Eye, Loader2, RotateCcw, Shuffle, Wand2, X } from "lucide-react";
import OrchestratorGraph from "../OrchestratorGraph";
import Swirl from "./Swirl";
import { DEPARTMENTS, type DeptId } from "@/lib/departments";

const C = (id: DeptId) => DEPARTMENTS.find((d) => d.id === id)!.color;

/** A tick counter that runs only while the element is on screen. */
function useTick(ms: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !timer) timer = setInterval(() => setTick((t) => t + 1), ms);
      if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
    });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); if (timer) clearInterval(timer); };
  }, [ms]);
  return [ref, tick, setTick] as const;
}

/* ------------------------------------------------------------------ */
/* Orchestrator: pick a goal, watch it get planned and run.            */
/* ------------------------------------------------------------------ */

type Step = { title: string; dept: DeptId; agent: string; review?: boolean };
const GOALS: { goal: string; steps: Step[] }[] = [
  {
    goal: "Launch pricing, book 20 demos",
    steps: [
      { title: "Scan competitor pricing", dept: "intelligence", agent: "Market Radar" },
      { title: "Draft launch post and reel", dept: "marketing", agent: "Content Writer", review: true },
      { title: "Build a 25 account list", dept: "sales", agent: "Prospector" },
      { title: "Write the outreach sequence", dept: "sales", agent: "Outreach Writer", review: true },
      { title: "Report on Friday", dept: "operations", agent: "Reporter" },
    ],
  },
  {
    goal: "Answer a rival's launch",
    steps: [
      { title: "Refresh the rival's brief", dept: "intelligence", agent: "Competitor Watch" },
      { title: "Pick three counter angles", dept: "marketing", agent: "Trend Rider" },
      { title: "Queue a comparison post", dept: "marketing", agent: "Content Writer", review: true },
      { title: "Nudge open deals", dept: "sales", agent: "Deal Coach" },
      { title: "Track replies", dept: "operations", agent: "Task Router" },
    ],
  },
  {
    goal: "Find 25 health tech leads",
    steps: [
      { title: "Map the health tech market", dept: "intelligence", agent: "Market Radar" },
      { title: "Prospect matching accounts", dept: "sales", agent: "Prospector" },
      { title: "Score by fit and intent", dept: "intelligence", agent: "Lead Scorer" },
      { title: "Draft first touches", dept: "sales", agent: "Outreach Writer", review: true },
      { title: "Assign owners", dept: "operations", agent: "Task Router" },
    ],
  },
];

export function OrchestratorDemo({ compact = false }: { compact?: boolean }) {
  const [pick, setPick] = useState(0);
  const [ref, tick, setTick] = useTick(110);
  const { goal, steps } = GOALS[pick];
  const typed = Math.min(goal.length, tick * 2);
  const typing = typed < goal.length;
  const t = Math.max(0, tick - Math.ceil(goal.length / 2) - 3);

  useEffect(() => {
    if (t > steps.length * 9 + 30) { setTick(0); setPick((p) => (p + 1) % GOALS.length); }
  }, [t, steps.length, setTick]);

  const status = (i: number) => {
    const s = i * 6 + 3;
    if (t < s) return "queued";
    if (t < s + 9) return "running";
    return steps[i].review ? "review" : "done";
  };
  const shown = typing ? 0 : Math.min(steps.length, Math.floor(t / 1.4) + 1);
  const active = Array.from(new Set(steps.filter((_, i) => status(i) === "running").map((s) => s.dept)));
  const counts = steps.reduce((a, s) => ({ ...a, [s.dept]: (a[s.dept] || 0) + 1 }), {} as Partial<Record<DeptId, number>>);

  return (
    <div ref={ref} className={`grid gap-6 ${compact ? "" : "md:grid-cols-[1.3fr_1fr]"}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g, i) => (
            <button
              key={g.goal}
              onClick={() => { setPick(i); setTick(0); }}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${i === pick ? "border-cream/40 bg-cream/10 text-cream" : "border-cream/10 text-mist hover:text-cream"}`}
            >
              {g.goal}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-cream/10 bg-cream/[0.03] p-2 pl-4">
          <Wand2 size={16} className="shrink-0 text-teal" />
          <span className="min-w-0 flex-1 truncate text-[15px]">
            {goal.slice(0, typed)}
            {typing && <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-cream" />}
          </span>
          <span className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${typing ? "bg-cream/10 text-mist" : "bg-cream text-night"}`}>Run</span>
        </div>
        <ol className="mt-3 min-h-[290px] space-y-2">
          {steps.slice(0, shown).map((s, i) => {
            const st = status(i);
            return (
              <li key={s.title} className={`rise flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${st === "running" ? "border-teal/40 bg-teal/[0.07]" : "border-cream/[0.07] bg-cream/[0.02]"}`}>
                {st === "running" ? <Loader2 size={16} className="shrink-0 animate-spin text-teal" /> : st === "done" ? <CheckCircle2 size={16} className="shrink-0 text-teal" /> : st === "review" ? <Eye size={16} className="shrink-0 text-ops" /> : <CircleDashed size={16} className="shrink-0 text-dusk" />}
                <span className="min-w-0 flex-1 truncate text-[14px]">{s.title}</span>
                <span className="hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] sm:inline" style={{ color: C(s.dept), background: `${C(s.dept)}1f` }}>{s.agent}</span>
              </li>
            );
          })}
        </ol>
      </div>
      {!compact && (
        <div className="hidden items-center justify-center text-cream md:flex">
          <OrchestratorGraph active={active} counts={counts} size={320} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Department widgets.                                                 */
/* ------------------------------------------------------------------ */

function MarketingWidget() {
  const caption = "Three plans. No seat tax. A free demo mode that runs the whole company.";
  const [ref, tick] = useTick(60);
  const cycle = tick % 170;
  const typed = Math.min(caption.length, cycle);
  const approved = cycle > 120;
  return (
    <div ref={ref} className="grid gap-4 sm:grid-cols-[220px_1fr]">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-night">
        <Swirl seed={14} scale={2.4} accent={C("marketing")} interactive={false} />
        <p className="absolute bottom-3 left-3 right-3 font-display text-[20px] font-semibold leading-tight tracking-[-0.03em] text-cream drop-shadow">Pricing that grows with you</p>
      </div>
      <div className="flex flex-col">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-dusk">Content Writer · post</p>
        <p className="mt-3 min-h-[72px] text-[15px] leading-relaxed">{caption.slice(0, typed)}{typed < caption.length && <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-cream align-middle" />}</p>
        <p className="mt-2 text-[13px] text-teal">#autonomos #agents #ops</p>
        <div className="mt-auto pt-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${approved ? "bg-teal text-night" : "border border-cream/15 text-mist"}`}>
            {approved ? <><Check size={14} /> Approved, scheduled 18:00</> : <><Eye size={14} /> Waiting for you</>}
          </span>
        </div>
      </div>
    </div>
  );
}

const STAGES = ["Lead", "Contacted", "Meeting", "Proposal", "Won"];
const DEALS = [
  { n: "Northwind", v: "$18k", s: 0 },
  { n: "Copperleaf", v: "$42k", s: 1 },
  { n: "Lumen", v: "$9.6k", s: 2 },
  { n: "Tidewater", v: "$31k", s: 0 },
  { n: "Harbor", v: "$26k", s: 3 },
];

function SalesWidget() {
  const [ref, tick] = useTick(1300);
  return (
    <div ref={ref} className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="grid min-w-[560px] grid-cols-5 gap-2">
        {STAGES.map((stage, si) => (
          <div key={stage} className="min-h-[220px] rounded-xl bg-cream/[0.03] p-2">
            <p className="mb-2 px-1 font-mono text-[10.5px] uppercase tracking-wider text-dusk">{stage}</p>
            {DEALS.filter((d, i) => (d.s + Math.floor((tick + i * 2) / 3)) % 5 === si).map((d) => (
              <div key={d.n} className="rise mb-2 rounded-lg border border-cream/[0.07] bg-night p-2.5">
                <p className="text-[13px]">{d.n}</p>
                <p className="font-mono text-[11px]" style={{ color: C("sales") }}>{d.v}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const SIGNALS = [
  { a: 20, r: 0.62, t: "Relaykit ships agents beta", k: "launch" },
  { a: 110, r: 0.38, t: "Copperleaf raises Series A", k: "funding" },
  { a: 200, r: 0.78, t: "Tidewater hiring 3 SDRs", k: "hiring" },
  { a: 290, r: 0.5, t: "Opsline caps starter tier", k: "pricing" },
];

function IntelWidget() {
  const [ref, tick] = useTick(50);
  const angle = (tick * 3) % 360;
  const seen = SIGNALS.filter((s) => ((angle - s.a + 360) % 360) < 160);
  return (
    <div ref={ref} className="grid items-center gap-6 sm:grid-cols-[220px_1fr]">
      <svg viewBox="-110 -110 220 220" className="w-full max-w-[220px]">
        {[100, 70, 40].map((r) => <circle key={r} r={r} fill="none" stroke="#ede4cf" strokeOpacity="0.1" />)}
        <line x1="-100" y1="0" x2="100" y2="0" stroke="#ede4cf" strokeOpacity="0.06" />
        <line x1="0" y1="-100" x2="0" y2="100" stroke="#ede4cf" strokeOpacity="0.06" />
        <g transform={`rotate(${angle})`}>
          <path d="M0 0 L100 0 A100 100 0 0 0 70.7 -70.7 Z" fill="url(#sweep)" />
          <line x1="0" y1="0" x2="100" y2="0" stroke={C("intelligence")} strokeWidth="1.5" />
        </g>
        <defs>
          <linearGradient id="sweep" x1="1" y1="0" x2="0.7" y2="-0.7">
            <stop offset="0" stopColor={C("intelligence")} stopOpacity="0.45" />
            <stop offset="1" stopColor={C("intelligence")} stopOpacity="0" />
          </linearGradient>
        </defs>
        {SIGNALS.map((s) => {
          const on = seen.includes(s);
          const x = Math.cos((s.a * Math.PI) / 180) * s.r * 100;
          const y = Math.sin((s.a * Math.PI) / 180) * s.r * 100;
          return <circle key={s.t} cx={x} cy={y} r={on ? 4.5 : 2} fill={on ? "#ede4cf" : "#ede4cf55"} style={{ transition: "r .3s" }} />;
        })}
      </svg>
      <ul className="space-y-2">
        {SIGNALS.map((s) => (
          <li key={s.t} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500 ${seen.includes(s) ? "border-intel/40 bg-intel/[0.08] opacity-100" : "border-cream/[0.06] opacity-35"}`}>
            <span className="w-16 shrink-0 font-mono text-[10.5px] uppercase text-intel">{s.k}</span>
            <span className="text-[13.5px]">{s.t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TASKS: [string, DeptId][] = [
  ["Refresh competitor briefs", "intelligence"],
  ["Draft three launch posts", "marketing"],
  ["Prospect health tech", "sales"],
  ["Score webinar leads", "intelligence"],
  ["Weekly report", "operations"],
];

function OpsWidget() {
  const [ref, tick] = useTick(900);
  const cols = ["Queued", "Running", "Review", "Done"];
  return (
    <div ref={ref} className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {cols.map((c, ci) => (
        <div key={c} className="min-h-[200px] rounded-xl bg-cream/[0.03] p-2">
          <p className="mb-2 px-1 font-mono text-[10.5px] uppercase tracking-wider text-dusk">{c}</p>
          {TASKS.filter((_, i) => Math.min(3, Math.max(0, Math.floor((tick - i * 2) / 2) % 6)) === ci).map(([t, d]) => (
            <div key={t} className="rise mb-2 rounded-lg border border-cream/[0.07] bg-night p-2.5">
              <p className="text-[12.5px] leading-snug">{t}</p>
              <span className="mt-1.5 inline-block h-1.5 w-6 rounded-full" style={{ background: C(d) }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const WIDGETS: Record<DeptId, () => React.JSX.Element> = {
  marketing: MarketingWidget,
  sales: SalesWidget,
  intelligence: IntelWidget,
  operations: OpsWidget,
};

export function DeptWidget({ id }: { id: DeptId }) {
  const W = WIDGETS[id];
  return <W />;
}

export function DeptDemo() {
  const [tab, setTab] = useState<DeptId>("marketing");
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {DEPARTMENTS.map((d) => (
          <button
            key={d.id}
            onClick={() => setTab(d.id)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] transition-colors ${tab === d.id ? "border-cream/30 bg-cream/10 text-cream" : "border-cream/10 text-mist hover:text-cream"}`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} /> {d.name}
          </button>
        ))}
      </div>
      <div key={tab} className="rise mt-6 rounded-[24px] border border-cream/[0.08] bg-night-2 p-5 md:p-7">
        <DeptWidget id={tab} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Approval: the human in the loop, as a game.                          */
/* ------------------------------------------------------------------ */

const DRAFTS: [string, DeptId, string][] = [
  ["Launch post: pricing that grows with you", "marketing", "Content Writer"],
  ["4-step sequence for Copperleaf", "sales", "Outreach Writer"],
  ["Counter-post on Relaykit's launch", "marketing", "Trend Rider"],
  ["Proposal follow-up for Northwind", "sales", "Deal Coach"],
  ["Story: what shipped this week", "marketing", "Story Generator"],
];

export function ApprovalDemo() {
  const [i, setI] = useState(0);
  const [log, setLog] = useState<{ ok: boolean }[]>([]);
  const done = i >= DRAFTS.length;
  const act = (ok: boolean) => { setLog((l) => [...l, { ok }]); setI((n) => n + 1); };
  const shipped = log.filter((l) => l.ok).length;

  return (
    <div className="mx-auto max-w-xl">
      <div className="relative h-[150px]">
        {done ? (
          <div className="rise flex h-full flex-col items-center justify-center gap-3 rounded-[24px] border border-cream/10 bg-night-2 text-center">
            <p className="font-display text-[44px] font-semibold tracking-[-0.05em]">{shipped} shipped</p>
            <button onClick={() => { setI(0); setLog([]); }} className="inline-flex items-center gap-1.5 text-[13px] text-mist hover:text-cream"><RotateCcw size={13} /> again</button>
          </div>
        ) : (
          DRAFTS.slice(i, i + 3).reverse().map(([t, d, a], k, arr) => {
            const depth = arr.length - 1 - k;
            return (
              <div
                key={t}
                className="absolute inset-x-0 top-0 rounded-[24px] border border-cream/10 bg-night-2 p-6 transition-all duration-300"
                style={{ transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.04})`, opacity: depth ? 0.5 - depth * 0.15 : 1, zIndex: 10 - depth }}
              >
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: C(d) }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: C(d) }} /> {a}
                </p>
                <p className="mt-4 font-display text-[22px] font-semibold leading-tight tracking-[-0.03em]">{t}</p>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-8 flex items-center justify-center gap-3">
        <button disabled={done} onClick={() => act(false)} className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-cream/15 text-mist transition-colors hover:border-cream/40 hover:text-cream disabled:opacity-30" aria-label="Discard"><X size={22} /></button>
        <button disabled={done} onClick={() => act(true)} className="inline-flex h-14 items-center gap-2 rounded-full bg-cream px-7 text-[15px] font-semibold text-night transition-colors hover:bg-star disabled:opacity-30"><Check size={18} /> Approve</button>
      </div>
      <div className="mt-6 flex justify-center gap-1.5">
        {DRAFTS.map((_, k) => <span key={k} className={`h-1.5 w-6 rounded-full ${k < log.length ? (log[k].ok ? "bg-teal" : "bg-cream/30") : "bg-cream/10"}`} />)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Coordination: hand-offs light up in dependency order.               */
/* ------------------------------------------------------------------ */

export function ChainDemo() {
  const [ref, tick] = useTick(700);
  const chain: [string, DeptId][] = [["Research", "intelligence"], ["Angles", "marketing"], ["Content", "marketing"], ["Outreach", "sales"], ["Report", "operations"]];
  const at = tick % (chain.length + 3);
  return (
    <div ref={ref} className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
      {chain.map(([l, d], i) => (
        <div key={l} className="flex flex-1 flex-col items-center gap-2 md:flex-row">
          <div className={`w-full rounded-2xl border px-4 py-5 text-center transition-all duration-500 ${i < at ? "border-transparent" : "border-cream/10"}`} style={i < at ? { background: `${C(d)}26`, boxShadow: `inset 0 0 0 1px ${C(d)}66` } : undefined}>
            <p className="font-display text-[19px] font-semibold tracking-[-0.03em]">{l}</p>
            <p className="mt-1 font-mono text-[10.5px] uppercase" style={{ color: i < at ? C(d) : "#6c7489" }}>{i < at ? "done" : i === at ? "next" : "waiting"}</p>
          </div>
          {i < chain.length - 1 && <div className={`h-6 w-px md:h-px md:w-6 ${i < at - 1 ? "bg-cream/50" : "bg-cream/10"}`} />}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small bits.                                                          */
/* ------------------------------------------------------------------ */

export function CountUp({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const [ref, tick] = useTick(30);
  const v = Math.min(to, Math.round((tick / 40) * to));
  return <div ref={ref} className="tabular-nums">{prefix}{v}{suffix}</div>;
}

export function SwirlPlayground() {
  const [seed, setSeed] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [accent, setAccent] = useState("#6E8CCB");
  return (
    <div>
      <div className="relative h-[460px] overflow-hidden rounded-[28px] bg-night">
        <Swirl seed={seed} speed={speed} scale={scale} accent={accent} />
      </div>
      <div className="mt-4 grid gap-4 rounded-[22px] border border-cream/[0.08] bg-night-2 p-5 md:grid-cols-[auto_1fr_1fr_auto] md:items-center">
        <button onClick={() => setSeed(Math.random() * 100)} className="inline-flex items-center justify-center gap-2 rounded-full bg-cream px-5 py-2.5 text-[14px] font-semibold text-night hover:bg-star"><Shuffle size={15} /> New</button>
        <label className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-mist">
          flow <input type="range" min="0" max="4" step="0.1" value={speed} onChange={(e) => setSpeed(+e.target.value)} className="w-full accent-teal" />
        </label>
        <label className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-mist">
          zoom <input type="range" min="0.6" max="3" step="0.05" value={scale} onChange={(e) => setScale(+e.target.value)} className="w-full accent-teal" />
        </label>
        <div className="flex gap-2">
          {["#6E8CCB", ...DEPARTMENTS.map((d) => d.color)].filter((c, i, a) => a.findIndex((x) => x.toLowerCase() === c.toLowerCase()) === i).map((c) => (
            <button key={c} onClick={() => setAccent(c)} aria-label={`Accent ${c}`} className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-night-2 ${accent === c ? "ring-2 ring-cream" : ""}`} style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Swatch({ name, hex, dark }: { name: string; hex: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(hex).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      className="group flex h-40 flex-col justify-between rounded-[22px] border border-cream/[0.08] p-4 text-left transition-transform hover:-translate-y-0.5"
      style={{ background: hex, color: dark ? "#121827" : "#ede4cf" }}
    >
      <span className="font-display text-[20px] font-semibold tracking-[-0.03em]">{name}</span>
      <span className="font-mono text-[12px] opacity-80">{copied ? "copied" : hex}</span>
    </button>
  );
}
