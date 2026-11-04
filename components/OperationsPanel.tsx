"use client";

import { useState } from "react";
import { ArrowRight, Check, FileText, Loader2, RotateCcw, Zap } from "lucide-react";
import { Button, DeptChip, DeptHeader, Panel, Stat, agentName, ago } from "./dept-ui";
import { resetDemoData, useLocalState } from "./useLocalState";
import { DEPARTMENTS, type OpsReport, type PlanTask, type TaskStatus } from "@/lib/departments";
import { SEED_TASKS, SEED_WORKFLOWS, type Workflow } from "@/lib/demo-data";

const AMBER = "#e9b949";
const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "queued", label: "Queued" },
  { id: "running", label: "Running" },
  { id: "review", label: "Needs approval" },
  { id: "done", label: "Done" },
];

export default function OperationsPanel() {
  const [tasks, setTasks] = useLocalState<PlanTask[]>("tasks", SEED_TASKS);
  const [workflows, setWorkflows] = useLocalState<Workflow[]>("workflows", SEED_WORKFLOWS);
  const [report, setReport] = useState<OpsReport | null>(null);
  const [writing, setWriting] = useState(false);

  const done = tasks.filter((t) => t.status === "done").length;
  const review = tasks.filter((t) => t.status === "review").length;
  const hours = Math.round(tasks.filter((t) => t.status === "done").reduce((n, t) => n + t.etaMinutes * 6, 0) / 60);

  const approve = (id: string) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "done" } : t)));

  async function writeReport() {
    setWriting(true);
    const byDept = DEPARTMENTS.map((d) => `${d.name}: ${tasks.filter((t) => t.dept === d.id && t.status === "done").length} done`).join(", ");
    try {
      const res = await fetch("/api/departments/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "ops.reporter", input: { context: `${done} tasks closed, ${review} awaiting approval. ${byDept}.` } }),
      });
      const data = await res.json();
      if (res.ok) setReport(data.result.report);
    } finally {
      setWriting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <DeptHeader id="operations">
        <button onClick={resetDemoData} className="inline-flex items-center gap-1.5 rounded-full border border-gold/15 px-2.5 py-1 text-[11px] text-cool-steel hover:text-champagne" title="Restore the seeded demo data in every module">
          <RotateCcw size={12} /> reset demo
        </button>
      </DeptHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="tasks done" value={String(done)} color={AMBER} hint={`of ${tasks.length}`} />
        <Stat label="awaiting approval" value={String(review)} hint="human in the loop" />
        <Stat label="workflows live" value={String(workflows.filter((w) => w.enabled).length)} hint={`${workflows.reduce((n, w) => n + w.runs, 0)} runs total`} />
        <Stat label="hours saved" value={`~${hours}`} hint="estimate vs manual" />
      </div>

      <Panel title="task board">
        <div className="grid gap-3 md:grid-cols-4">
          {COLUMNS.map((col) => {
            const list = tasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="rounded-xl border border-gold/10 bg-ink-black/40 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-champagne">{col.label}</span>
                  <span className="rounded-full bg-gold/10 px-2 font-mono text-[11px] text-cool-steel">{list.length}</span>
                </div>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                  {list.map((t) => (
                    <div key={t.id} className="rise rounded-lg border border-gold/10 bg-twilight-indigo/60 p-3">
                      <p className="text-[13px] leading-snug text-champagne">{t.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <DeptChip id={t.dept} small />
                        <span className="font-mono text-[10px] text-cool-steel">{agentName(t.agent)}</span>
                      </div>
                      {t.goal && <p className="mt-1.5 truncate text-[10px] text-cool-steel/80">goal: {t.goal}</p>}
                      {col.id === "review" && (
                        <button onClick={() => approve(t.id)} className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald/15 px-2 py-1 text-[11px] text-emerald hover:bg-emerald/25">
                          <Check size={12} /> Approve
                        </button>
                      )}
                    </div>
                  ))}
                  {list.length === 0 && <p className="py-3 text-center text-[12px] text-cool-steel/70">nothing here</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="workflows">
          <ul className="space-y-3">
            {workflows.map((w) => (
              <li key={w.id} className="rounded-xl border border-gold/10 bg-ink-black/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-champagne">{w.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-cool-steel"><Zap size={11} /> {w.trigger}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={w.enabled}
                    aria-label={`Toggle ${w.name}`}
                    onClick={() => setWorkflows((prev) => prev.map((x) => (x.id === w.id ? { ...x, enabled: !x.enabled } : x)))}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${w.enabled ? "bg-emerald" : "bg-vintage-grape"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${w.enabled ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {w.steps.map((s, i) => {
                    const color = DEPARTMENTS.find((d) => d.id === s.dept)!.color;
                    return (
                      <span key={i} className="flex items-center gap-1.5">
                        <span className="rounded-md border px-2 py-0.5 text-[11px]" style={{ borderColor: `${color}55`, color, background: `${color}12` }}>{s.label}</span>
                        {i < w.steps.length - 1 && <ArrowRight size={12} className="text-cool-steel" />}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-2 font-mono text-[10px] text-cool-steel">{w.runs} runs · last {ago(w.lastRun)}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="reporter" action={<Button onClick={writeReport} disabled={writing}>{writing ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Write report</Button>}>
          {!report ? (
            <p className="text-[12px] text-cool-steel/80">The Reporter turns this week&apos;s real task outcomes into a one-page operating report.</p>
          ) : (
            <div className="rise space-y-4">
              <p className="font-serif text-xl leading-snug text-champagne">{report.headline}</p>
              {([["wins", report.wins, "text-emerald"], ["risks", report.risks, "text-strawberry-red"], ["next", report.next, "text-gold"]] as const).map(([label, items, cls]) => (
                <div key={label}>
                  <p className={`mb-1 font-mono text-[10px] uppercase tracking-wider ${cls}`}>{label}</p>
                  <ul className="space-y-1 text-[13px] text-champagne/90">{items.map((x) => <li key={x}>• {x}</li>)}</ul>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
