"use client";

import { useEffect, useMemo, useRef } from "react";
import { agentName } from "./dept-ui";
import { useLocalState } from "./useLocalState";
import type { Plan, PlanTask } from "@/lib/departments";
import { SEED_ACTIVITY, SEED_TASKS, type ActivityItem } from "@/lib/demo-data";

const REVIEW_AGENTS = new Set(["content-writer", "sales.outreach"]);

/**
 * Simulated execution of the current plan. Mounted once by the dashboard so
 * agents keep working through the plan whichever tab is open. Agents pick up
 * queued tasks whose dependencies are finished, two at a time; drafts that
 * need a human (content, outreach) land in review instead of done.
 */
export function useOrchestratorRunner() {
  const [plan] = useLocalState<Plan | null>("plan", null);
  const [tasks, setTasks] = useLocalState<PlanTask[]>("tasks", SEED_TASKS);
  const [, setActivity] = useLocalState<ActivityItem[]>("activity", SEED_ACTIVITY);
  const progress = useRef<Record<string, number>>({});

  const planTasks = useMemo(() => {
    if (!plan) return [];
    const ids = new Set(plan.tasks.map((t) => t.id));
    return tasks.filter((t) => ids.has(t.id));
  }, [plan, tasks]);
  const finished = planTasks.filter((t) => t.status === "done" || t.status === "review").length;

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // Simulated execution: agents pick up tasks whose dependencies are finished.
  useEffect(() => {
    if (!plan || planTasks.length === 0 || finished === planTasks.length) return;
    const inPlan = new Set(plan.tasks.map((p) => p.id));
    const timer = setInterval(() => {
      const prev = tasksRef.current;
      const byId = new Map(prev.map((t) => [t.id, t]));
      const isFinished = (id: string) => ["done", "review"].includes(byId.get(id)?.status || "");
      const logs: ActivityItem[] = [];
      const now = new Date().toISOString();
      let started = 0;
      const next = prev.map((t): PlanTask => {
        if (!inPlan.has(t.id)) return t;
        if (t.status === "running") {
          progress.current[t.id] = (progress.current[t.id] || 0) + 1;
          if (progress.current[t.id] >= 2 + (t.etaMinutes % 3)) {
            const status = REVIEW_AGENTS.has(t.agent) ? "review" : "done";
            logs.push({ id: `a-${t.id}-${status}`, dept: t.dept, text: `${agentName(t.agent)} ${status === "review" ? "sent for your approval" : "finished"}: ${t.title}`, at: now });
            return { ...t, status };
          }
          return t;
        }
        if (t.status === "queued" && started < 2 && t.dependsOn.every(isFinished)) {
          started++;
          logs.push({ id: `a-${t.id}-start`, dept: t.dept, text: `${agentName(t.agent)} started: ${t.title}`, at: now });
          return { ...t, status: "running" };
        }
        return t;
      });
      if (!logs.length) return;
      tasksRef.current = next;
      setTasks(next);
      setActivity((old) => {
        const seen = new Set(old.map((a) => a.id));
        return [...logs.filter((l) => !seen.has(l.id)).reverse(), ...old].slice(0, 40);
      });
    }, 1100);
    return () => clearInterval(timer);
  }, [plan, planTasks.length, finished, setTasks, setActivity]);
}

