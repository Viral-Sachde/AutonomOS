/**
 * The four departments the orchestrator delegates to, and the agents in each.
 *
 * Client-safe: no server imports, so the dashboard, the landing page and the
 * API routes all read the same definitions.
 */

export type DeptId = "marketing" | "sales" | "intelligence" | "operations";

export interface DeptAgent {
  id: string;
  name: string;
  role: string;
}

export interface Department {
  id: DeptId;
  name: string;
  blurb: string;
  color: string;
  mark: string;
  agents: DeptAgent[];
}

export const BRAND = {
  name: "AutonomOS",
  tagline: "AI company orchestration platform",
  ember: "#e0584c",
  ink: "#121110",
};

export const DEPARTMENTS: Department[] = [
  {
    id: "marketing",
    name: "Marketing",
    blurb: "Research, content, campaigns",
    color: "#f28c5b",
    mark: "/brand/marketing.svg",
    agents: [
      { id: "content-writer", name: "Content Writer", role: "Writes daily posts, reels and stories in the brand voice" },
      { id: "illustration-studio", name: "Illustration Studio", role: "Renders on-brand artwork for every piece" },
      { id: "trend-rider", name: "Trend Rider", role: "Finds formats and hooks that are working right now" },
      { id: "content-calendar", name: "Content Calendar", role: "Plans the week and keeps the schedule full" },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    blurb: "Prospecting, outreach, CRM",
    color: "#4fb286",
    mark: "/brand/sales.svg",
    agents: [
      { id: "sales.prospector", name: "Prospector", role: "Finds and qualifies leads against your ICP" },
      { id: "sales.outreach", name: "Outreach Writer", role: "Drafts personalised multi-step email sequences" },
      { id: "sales.coach", name: "Deal Coach", role: "Suggests the next best action for each open deal" },
      { id: "sales.crm", name: "CRM Keeper", role: "Logs activity, dedupes contacts, keeps stages honest" },
    ],
  },
  {
    id: "intelligence",
    name: "Intelligence",
    blurb: "Competitors, markets, leads",
    color: "#7a9cf5",
    mark: "/brand/intelligence.svg",
    agents: [
      { id: "intel.competitor", name: "Competitor Watch", role: "Builds and refreshes a brief on every rival" },
      { id: "intel.market", name: "Market Radar", role: "Surfaces signals: launches, funding, hiring, pricing" },
      { id: "intel.scorer", name: "Lead Scorer", role: "Ranks inbound and prospected leads by fit and intent" },
      { id: "intel.digest", name: "Signal Digest", role: "Condenses the week into what actually matters" },
    ],
  },
  {
    id: "operations",
    name: "Operations",
    blurb: "Tasks, workflows, reporting",
    color: "#e9b949",
    mark: "/brand/operations.svg",
    agents: [
      { id: "ops.router", name: "Task Router", role: "Turns plans into owned, ordered tasks" },
      { id: "ops.workflow", name: "Workflow Runner", role: "Runs repeatable multi-agent workflows on triggers" },
      { id: "ops.reporter", name: "Reporter", role: "Writes the weekly report from real outcomes" },
      { id: "ops.sla", name: "SLA Guardian", role: "Flags stuck work before it becomes late work" },
    ],
  },
];

/** Marketing ships ten agents in the original hub; the panel above lists four highlights. */
export const MARKETING_AGENT_COUNT = 10;
export const TOTAL_AGENTS =
  MARKETING_AGENT_COUNT +
  DEPARTMENTS.filter((d) => d.id !== "marketing").reduce((n, d) => n + d.agents.length, 0);

export function dept(id: DeptId): Department {
  return DEPARTMENTS.find((d) => d.id === id)!;
}

/* ------------------------------------------------------------------ */
/* Shapes shared by the orchestrator API and the department panels.    */
/* ------------------------------------------------------------------ */

export type TaskStatus = "queued" | "running" | "review" | "done";

export interface PlanTask {
  id: string;
  title: string;
  detail: string;
  dept: DeptId;
  agent: string;
  dependsOn: string[];
  etaMinutes: number;
  status: TaskStatus;
  goal?: string;
}

export interface Plan {
  id: string;
  goal: string;
  summary: string;
  tasks: PlanTask[];
  createdAt: string;
  source: "ai" | "template";
}

export interface Lead {
  id: string;
  company: string;
  contact: string;
  title: string;
  fit: number;
  reason: string;
}

export interface SequenceStep {
  day: number;
  subject: string;
  body: string;
}

export interface CompetitorBrief {
  id: string;
  name: string;
  positioning: string;
  pricing: string;
  strengths: string[];
  weaknesses: string[];
  moves: string[];
  threat: "low" | "medium" | "high";
  updatedAt: string;
}

export interface OpsReport {
  headline: string;
  wins: string[];
  risks: string[];
  next: string[];
}

export type DeptAgentResult =
  | { kind: "leads"; leads: Lead[]; source: "ai" | "template" }
  | { kind: "sequence"; steps: SequenceStep[]; source: "ai" | "template" }
  | { kind: "brief"; brief: CompetitorBrief; source: "ai" | "template" }
  | { kind: "report"; report: OpsReport; source: "ai" | "template" };
