"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Eye, Loader2, Wand2 } from "lucide-react";
import OrchestratorGraph from "../OrchestratorGraph";
import { DEPARTMENTS, type DeptId } from "@/lib/departments";

type Step = { title: string; dept: DeptId; agent: string; review?: boolean };

const SCRIPTS: { goal: string; steps: Step[] }[] = [
  {
    goal: "Launch the new pricing page and book 20 demos",
    steps: [
      { title: "Scan competitor pricing moves", dept: "intelligence", agent: "Market Radar" },
      { title: "Draft launch post and reel script", dept: "marketing", agent: "Content Writer", review: true },
      { title: "Build a 25 account lead list", dept: "sales", agent: "Prospector" },
      { title: "Write a 4-step outreach sequence", dept: "sales", agent: "Outreach Writer", review: true },
      { title: "Assign owners and report Friday", dept: "operations", agent: "Task Router" },
    ],
  },
  {
    goal: "Respond to a rival's agents launch this week",
    steps: [
      { title: "Refresh the rival's competitor brief", dept: "intelligence", agent: "Competitor Watch" },
      { title: "Pick three counter angles", dept: "marketing", agent: "Trend Rider" },
      { title: "Queue a comparison post", dept: "marketing", agent: "Content Writer", review: true },
      { title: "Nudge open deals with the news", dept: "sales", agent: "Deal Coach" },
      { title: "Track replies and summarise", dept: "operations", agent: "Reporter" },
    ],
  },
];

const color = (id: DeptId) => DEPARTMENTS.find((d) => d.id === id)!.color;

export default function HeroDemo() {
  const [script, setScript] = useState(0);
  const [tick, setTick] = useState(0);
  const { goal, steps } = SCRIPTS[script];
  const typed = Math.min(goal.length, tick * 2);
  const typing = typed < goal.length;
  const t = Math.max(0, tick - Math.ceil(goal.length / 2) - 2);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 120);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (t > steps.length * 10 + 25) {
      setTick(0);
      setScript((s) => (s + 1) % SCRIPTS.length);
    }
  }, [t, steps.length]);

  const statusOf = (i: number) => {
    const start = i * 7 + 4;
    if (t < start) return "queued";
    if (t < start + 9) return "running";
    return steps[i].review ? "review" : "done";
  };
  const visible = typing ? 0 : Math.min(steps.length, Math.floor(t / 1.5) + 1);
  const active = Array.from(new Set(steps.filter((_, i) => statusOf(i) === "running").map((s) => s.dept)));
  const counts = steps.reduce((a, s) => ({ ...a, [s.dept]: (a[s.dept] || 0) + 1 }), {} as Partial<Record<DeptId, number>>);

  return (
    <div className="grid gap-6 md:grid-cols-[1.35fr_1fr]">
      <div className="min-w-0">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2 pl-3">
          <Wand2 size={15} className="shrink-0 text-[#ee7a6f]" />
          <span className="min-w-0 flex-1 truncate text-[13px] text-white/90">
            {goal.slice(0, typed)}
            {typing && <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-white" />}
          </span>
          <span className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-colors ${typing ? "bg-white/10" : "bg-[#e0584c]"}`}>Plan and run</span>
        </div>
        <ol className="mt-3 space-y-2">
          {steps.slice(0, visible).map((s, i) => {
            const st = statusOf(i);
            return (
              <li key={s.title} className="rise flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                <span className="shrink-0">
                  {st === "running" ? <Loader2 size={15} className="animate-spin text-[#ee7a6f]" /> : st === "done" ? <CheckCircle2 size={15} className="text-[#4fb286]" /> : st === "review" ? <Eye size={15} className="text-[#e9b949]" /> : <CircleDashed size={15} className="text-white/40" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-white/90">{s.title}</span>
                <span className="hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] sm:inline" style={{ color: color(s.dept), background: `${color(s.dept)}1f` }}>
                  {s.agent}
                </span>
              </li>
            );
          })}
          {visible === 0 && <li className="px-1 py-6 text-[13px] text-white/40">The orchestrator is reading your goal...</li>}
        </ol>
      </div>
      <div className="hidden items-center justify-center text-white md:flex">
        <OrchestratorGraph active={active} counts={counts} size={280} />
      </div>
    </div>
  );
}
