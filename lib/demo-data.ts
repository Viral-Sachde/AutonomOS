/**
 * Seeded dummy data for the Sales, Intelligence and Operations modules.
 *
 * Every company and person here is fictional. The modules start from this so
 * the platform looks alive on first load without any API credits, and the
 * operator's own changes are kept in the browser on top of it.
 */

import type { CompetitorBrief, DeptId, Lead, PlanTask } from "./departments";

export type DealStage = "lead" | "contacted" | "meeting" | "proposal" | "won";

export interface Deal {
  id: string;
  company: string;
  contact: string;
  value: number;
  stage: DealStage;
  owner: string;
  nextStep: string;
  updatedAt: string;
}

export const DEAL_STAGES: { id: DealStage; label: string }[] = [
  { id: "lead", label: "Lead" },
  { id: "contacted", label: "Contacted" },
  { id: "meeting", label: "Meeting" },
  { id: "proposal", label: "Proposal" },
  { id: "won", label: "Won" },
];

const d = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

export const SEED_DEALS: Deal[] = [
  { id: "deal-1", company: "Northwind Labs", contact: "Maya Okafor", value: 18000, stage: "proposal", owner: "Deal Coach", nextStep: "Send the security questionnaire", updatedAt: d(1) },
  { id: "deal-2", company: "Copperleaf Health", contact: "Arjun Shah", value: 42000, stage: "meeting", owner: "Outreach Writer", nextStep: "Demo with their ops lead on Thursday", updatedAt: d(2) },
  { id: "deal-3", company: "Lumen Logistics", contact: "Lena Lindqvist", value: 9600, stage: "contacted", owner: "Outreach Writer", nextStep: "Follow-up email 2 of 4", updatedAt: d(0) },
  { id: "deal-4", company: "Fieldnote Studio", contact: "Diego Moreau", value: 7200, stage: "lead", owner: "Prospector", nextStep: "Score and qualify", updatedAt: d(0) },
  { id: "deal-5", company: "Harbor Analytics", contact: "Priya Reyes", value: 26000, stage: "won", owner: "Deal Coach", nextStep: "Kickoff call booked", updatedAt: d(3) },
  { id: "deal-6", company: "Quillstack Cloud", contact: "Theo Kim", value: 15400, stage: "contacted", owner: "Outreach Writer", nextStep: "Waiting on reply", updatedAt: d(1) },
  { id: "deal-7", company: "Tidewater Works", contact: "Noor Duarte", value: 31000, stage: "meeting", owner: "Deal Coach", nextStep: "Pricing walkthrough", updatedAt: d(2) },
  { id: "deal-8", company: "Parallax Systems", contact: "Isha Patel", value: 5400, stage: "lead", owner: "Prospector", nextStep: "Find the right contact", updatedAt: d(0) },
];

export const SEED_COMPETITORS: CompetitorBrief[] = [
  {
    id: "comp-1", name: "Relaykit", threat: "high", updatedAt: d(1),
    positioning: "AI assistants for marketing teams, sold per seat.",
    pricing: "From $49 per seat per month",
    strengths: ["Polished editor", "Big template library"],
    weaknesses: ["Marketing only, no sales or ops", "No approval step before publishing"],
    moves: ["Launched an agents beta last week", "Raised starter price by 20%"],
  },
  {
    id: "comp-2", name: "Opsline", threat: "medium", updatedAt: d(3),
    positioning: "Workflow automation for operations teams with AI steps bolted on.",
    pricing: "Usage based, $299 platform fee",
    strengths: ["Hundreds of integrations", "Enterprise logos"],
    weaknesses: ["Humans route every task", "Steep learning curve"],
    moves: ["Announced a partner program", "Hiring a VP of AI"],
  },
  {
    id: "comp-3", name: "Pipewise", threat: "low", updatedAt: d(5),
    positioning: "Outbound email sequencer with AI personalisation.",
    pricing: "$99 per mailbox per month",
    strengths: ["Deliverability tooling"],
    weaknesses: ["Single channel", "No market intelligence"],
    moves: ["Shipped a LinkedIn integration"],
  },
];

export interface Signal {
  id: string;
  kind: "launch" | "funding" | "hiring" | "pricing" | "mention";
  title: string;
  source: string;
  sentiment: "positive" | "neutral" | "negative";
  at: string;
}

export const SEED_SIGNALS: Signal[] = [
  { id: "s1", kind: "launch", title: "Relaykit opens an agents beta to all paid plans", source: "Product changelog", sentiment: "negative", at: d(0) },
  { id: "s2", kind: "funding", title: "Copperleaf Health raises a $12M Series A", source: "Press release", sentiment: "positive", at: d(1) },
  { id: "s3", kind: "hiring", title: "Tidewater Works is hiring 3 SDRs and a RevOps lead", source: "Careers page", sentiment: "positive", at: d(1) },
  { id: "s4", kind: "pricing", title: "Opsline adds a usage cap to its starter tier", source: "Pricing page", sentiment: "neutral", at: d(2) },
  { id: "s5", kind: "mention", title: "Thread: \"anyone automating their Friday reporting?\" (48 replies)", source: "Community forum", sentiment: "positive", at: d(2) },
  { id: "s6", kind: "launch", title: "Pipewise ships LinkedIn steps in sequences", source: "Product blog", sentiment: "neutral", at: d(4) },
];

export const SEED_SCORED_LEADS: Lead[] = [
  { id: "l1", company: "Tidewater Works", contact: "Noor Duarte", title: "COO", fit: 94, reason: "Hiring SDRs and RevOps this month." },
  { id: "l2", company: "Copperleaf Health", contact: "Arjun Shah", title: "Head of Growth", fit: 89, reason: "Fresh Series A, scaling go-to-market." },
  { id: "l3", company: "Brightline Cloud", contact: "Sam Reyes", title: "Founder", fit: 81, reason: "Asked about automated reporting in a public thread." },
  { id: "l4", company: "Ember Analytics", contact: "Jonah Patel", title: "VP Sales", fit: 72, reason: "Switched CRM last quarter." },
  { id: "l5", company: "Parallax Systems", contact: "Isha Patel", title: "Director of Marketing", fit: 58, reason: "Small team, content on three channels." },
];

const t = (id: string, title: string, dept: DeptId, agent: string, status: PlanTask["status"], etaMinutes: number, detail = ""): PlanTask => ({
  id, title, dept, agent, status, etaMinutes, detail, dependsOn: [], goal: "Weekly operating rhythm",
});

export const SEED_TASKS: PlanTask[] = [
  t("ot1", "Refresh competitor briefs", "intelligence", "intel.competitor", "done", 12, "Relaykit, Opsline and Pipewise updated."),
  t("ot2", "Draft three posts for the launch week", "marketing", "content-writer", "review", 15, "Waiting on your approval in the review queue."),
  t("ot3", "Prospect 25 accounts in health tech", "sales", "sales.prospector", "running", 14),
  t("ot4", "Score inbound leads from the webinar", "intelligence", "intel.scorer", "queued", 5),
  t("ot5", "Write follow-ups for open proposals", "sales", "sales.outreach", "queued", 10),
  t("ot6", "Weekly report", "operations", "ops.reporter", "queued", 6),
];

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  steps: { dept: DeptId; label: string }[];
  enabled: boolean;
  runs: number;
  lastRun: string;
}

export const SEED_WORKFLOWS: Workflow[] = [
  {
    id: "wf1", name: "New lead to first touch", trigger: "Lead added to pipeline", enabled: true, runs: 128, lastRun: d(0),
    steps: [{ dept: "intelligence", label: "Score" }, { dept: "sales", label: "Draft email" }, { dept: "operations", label: "Assign owner" }],
  },
  {
    id: "wf2", name: "Competitor move to counter-post", trigger: "Competitor signal: launch", enabled: true, runs: 14, lastRun: d(1),
    steps: [{ dept: "intelligence", label: "Brief" }, { dept: "marketing", label: "Counter angle" }, { dept: "marketing", label: "Queue post" }],
  },
  {
    id: "wf3", name: "Friday operating report", trigger: "Every Friday 17:00", enabled: true, runs: 22, lastRun: d(4),
    steps: [{ dept: "operations", label: "Collect outcomes" }, { dept: "operations", label: "Write report" }],
  },
  {
    id: "wf4", name: "Stalled deal rescue", trigger: "Deal idle for 7 days", enabled: false, runs: 6, lastRun: d(9),
    steps: [{ dept: "sales", label: "Coach" }, { dept: "sales", label: "Nudge email" }, { dept: "operations", label: "Flag" }],
  },
];

export interface ActivityItem {
  id: string;
  dept: DeptId;
  text: string;
  at: string;
}

export const SEED_ACTIVITY: ActivityItem[] = [
  { id: "a1", dept: "intelligence", text: "Competitor Watch flagged a Relaykit launch as high threat", at: d(0) },
  { id: "a2", dept: "sales", text: "Deal Coach moved Northwind Labs to proposal", at: d(0) },
  { id: "a3", dept: "marketing", text: "Content Writer queued 3 posts for approval", at: d(0) },
  { id: "a4", dept: "operations", text: "SLA Guardian: 2 tasks waiting on review for over 24h", at: d(1) },
];
