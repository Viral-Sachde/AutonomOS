"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CircleDashed, Eye, Loader2, Sparkles, Wand2 } from "lucide-react";
import OrchestratorGraph from "./OrchestratorGraph";
import { DemoBadge, DeptChip, Panel, agentName, ago, inputClass } from "./dept-ui";
import { useLocalState } from "./useLocalState";
import { DEPARTMENTS, type DeptId, type Plan, type PlanTask } from "@/lib/departments";
import { SEED_ACTIVITY, SEED_TASKS, type ActivityItem } from "@/lib/demo-data";

const EXAMPLES = [
  "Launch our new pricing page and get 20 qualified demos",
  "Find 25 health tech leads and start outreach",
  "Respond to Relaykit's agents launch this week",
  "Prepare the Friday operating report",
];

export default function CommandPanel() {
  const [goal, setGoal] = useState("");
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useLocalState<Plan | null>("plan", null);
  const [tasks, setTasks] = useLocalState<PlanTask[]>("tasks", SEED_TASKS);
  const [activity, setActivity] = useLocalState<ActivityItem[]>("activity", SEED_ACTIVITY);

  const planTasks = useMemo(() => {
    if (!plan) return [];
    const ids = new Set(plan.tasks.map((t) => t.id));
    return tasks.filter((t) => ids.has(t.id)).sort((a, b) => plan.tasks.findIndex((x) => x.id === a.id) - plan.tasks.findIndex((x) => x.id === b.id));
  }, [plan, tasks]);

  const running = planTasks.filter((t) => t.status === "running");
  const finished = planTasks.filter((t) => t.status === "done" || t.status === "review").length;
  const active = Array.from(new Set(running.map((t) => t.dept))) as DeptId[];
  const counts = DEPARTMENTS.reduce((acc, d) => ({ ...acc, [d.id]: planTasks.filter((t) => t.dept === d.id).length }), {} as Record<DeptId, number>);

  async function run(g: string) {
    const text = g.trim();
    if (!text) return;
    setPlanning(true);
    setError(null);
    try {
      const res = await fetch("/api/orchestrator/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal: text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Planning failed");
      const p: Plan = data.plan;
      setPlan(p);
      setTasks((prev) => [...p.tasks, ...prev].slice(0, 80));
      setActivity((prev) => [{ id: `a-${p.id}`, dept: "operations" as DeptId, text: `Orchestrator planned ${p.tasks.length} tasks: ${p.goal}`, at: p.createdAt }, ...prev].slice(0, 40));
      setGoal("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Planning failed");
    }
    setPlanning(false);
  }

  const pct = planTasks.length ? Math.round((finished / planTasks.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <div className="rise relative overflow-hidden rounded-2xl border border-gold/15 bg-twilight-indigo/40 p-6 md:p-8">
        <div className="pointer-events-none absolute -left-20 -top-32 h-80 w-80 rounded-full bg-pulse opacity-25 blur-3xl" />
        <div className="relative grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[2px] text-cool-steel">orchestrator</p>
              <DemoBadge />
            </div>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-champagne md:text-5xl">What should the company do next?</h1>
            <p className="mt-3 max-w-lg text-sm text-cool-steel">
              Describe a goal. The orchestration layer plans the work, delegates each task to the right agent, coordinates the hand-offs and tracks the outcome.
            </p>
            <form
              className="mt-6 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                run(goal);
              }}
            >
              <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Launch the spring campaign and book 10 demos" className={inputClass} />
              <button
                type="submit"
                disabled={planning || !goal.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-pulse px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c94a3f] disabled:opacity-50"
              >
                {planning ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                Plan and run
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => run(ex)} disabled={planning} className="rounded-full border border-gold/15 px-3 py-1 text-[12px] text-cool-steel transition-colors hover:border-gold/40 hover:text-champagne">
                  {ex}
                </button>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-strawberry-red">{error}</p>}
          </div>
          <div className="flex justify-center text-champagne">
            <OrchestratorGraph active={active} counts={counts} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel
          title={plan ? "current plan" : "no plan yet"}
          action={plan && <span className="font-mono text-[11px] text-cool-steel">{finished}/{planTasks.length} complete</span>}
        >
          {!plan ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Sparkles className="text-gold" />
              <p className="max-w-sm text-sm text-cool-steel">Pick an example above or type your own goal. You will see the plan appear here and the agents pick it up in order.</p>
            </div>
          ) : (
            <>
              <p className="mb-1 text-[15px] text-champagne">{plan.goal}</p>
              <p className="mb-4 text-[13px] text-cool-steel">{plan.summary}</p>
              <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-ink-black/70">
                <div className="h-full rounded-full bg-gradient-to-r from-pulse to-gold transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <ol className="space-y-2">
                {planTasks.map((t, i) => (
                  <li key={t.id} className={`rise flex items-start gap-3 rounded-xl border p-3 transition-colors ${t.status === "running" ? "border-gold/40 bg-gold/5" : "border-gold/10 bg-ink-black/40"}`} style={{ animationDelay: `${i * 40}ms` }}>
                    <span className="mt-0.5 shrink-0">
                      {t.status === "running" ? <Loader2 size={16} className="animate-spin text-gold" /> : t.status === "done" ? <CheckCircle2 size={16} className="text-emerald" /> : t.status === "review" ? <Eye size={16} className="text-ops" /> : <CircleDashed size={16} className="text-cool-steel" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-champagne">{t.title}</span>
                        <DeptChip id={t.dept} small />
                      </div>
                      {t.detail && <p className="mt-0.5 text-[12px] text-cool-steel">{t.detail}</p>}
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-cool-steel/80">
                        {agentName(t.agent)} · ~{t.etaMinutes} min · {t.status === "review" ? "awaiting approval" : t.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              {finished === planTasks.length && (
                <a href="#operations" className="mt-4 inline-flex items-center gap-1.5 text-sm text-gold hover:underline">
                  See it on the operations board <ArrowRight size={14} />
                </a>
              )}
            </>
          )}
        </Panel>

        <Panel title="live activity">
          <ul className="max-h-[560px] space-y-3 overflow-y-auto pr-1 scrollbar-thin">
            {activity.map((a) => (
              <li key={a.id} className="rise flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: DEPARTMENTS.find((d) => d.id === a.dept)?.color }} />
                <div>
                  <p className="text-[13px] leading-snug text-champagne">{a.text}</p>
                  <p className="font-mono text-[10px] text-cool-steel">{ago(a.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
