/**
 * The orchestration layer: turns a goal into a plan of delegated tasks, and
 * runs the individual department agents.
 *
 * Demo mode by default: these agents never call a paid model unless
 * ORCHESTRATOR_AI=on is set. Every path has a deterministic template that
 * produces realistic, clearly fictional dummy data, so the platform runs and
 * demos at $0 with no API credits at all.
 */

import { callAI as callProvider, withSteer, type CallOptions } from "./ai-provider";

/** True only when the operator explicitly opts in to spending model credits here. */
export function orchestratorUsesAI(): boolean {
  return (process.env.ORCHESTRATOR_AI || "").toLowerCase() === "on";
}

/** Returns null (template path) unless AI is explicitly enabled for the orchestrator. */
async function callAI(prompt: string, agentId: string, opts: CallOptions = {}): Promise<string | null> {
  if (!orchestratorUsesAI()) return null;
  return callProvider(prompt, agentId, opts);
}
import {
  DEPARTMENTS,
  type CompetitorBrief,
  type DeptAgentResult,
  type DeptId,
  type Lead,
  type OpsReport,
  type Plan,
  type PlanTask,
  type SequenceStep,
} from "./departments";

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Pulls the first JSON object out of a model reply, tolerating code fences and prose. */
function extractJSON<T>(text: string | null): T | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** Small seeded PRNG so template output is varied but stable for the same input. */
function seeded(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rnd: () => number, arr: T[]) => arr[Math.floor(rnd() * arr.length)];

const DEPT_IDS = DEPARTMENTS.map((d) => d.id);
const AGENT_IDS = new Set(DEPARTMENTS.flatMap((d) => d.agents.map((a) => a.id)));

/* ------------------------------------------------------------------ */
/* Planning                                                            */
/* ------------------------------------------------------------------ */

export async function planGoal(goal: string, context?: string): Promise<Plan> {
  const clean = goal.trim().slice(0, 500);
  const roster = DEPARTMENTS.map(
    (d) => `- ${d.id}: ${d.agents.map((a) => `${a.id} (${a.role})`).join("; ")}`,
  ).join("\n");

  const prompt = withSteer(
    `You are the orchestration layer of AutonomOS, an AI company operating system.
Break the operator's goal into 5 to 8 concrete tasks and delegate each one to a
department agent from this roster:

${roster}

Rules:
- Every task must name exactly one dept and one agent id from the roster.
- Order tasks so research comes before content, and content before outreach.
- dependsOn lists the zero-based indexes of earlier tasks it waits on.
- etaMinutes is a realistic estimate for an AI agent, between 2 and 60.
- Plain, specific language. No em dashes.

Goal: """${clean}"""

Reply with JSON only:
{"summary": "one sentence", "tasks": [{"title": "...", "detail": "...", "dept": "intelligence", "agent": "intel.market", "dependsOn": [], "etaMinutes": 10}]}`,
    context,
  );

  type Raw = { summary?: string; tasks?: { title?: string; detail?: string; dept?: string; agent?: string; dependsOn?: number[]; etaMinutes?: number }[] };
  const raw = extractJSON<Raw>(await callAI(prompt, "orchestrator", { maxTokens: 2500 }));

  if (raw?.tasks?.length) {
    const ids = raw.tasks.map(() => uid("t"));
    const tasks: PlanTask[] = raw.tasks
      .slice(0, 10)
      .map((t, i) => {
        const deptId = (DEPT_IDS as string[]).includes(t.dept || "") ? (t.dept as DeptId) : "operations";
        const agent = AGENT_IDS.has(t.agent || "") ? t.agent! : DEPARTMENTS.find((d) => d.id === deptId)!.agents[0].id;
        return {
          id: ids[i],
          title: String(t.title || "Untitled task").slice(0, 120),
          detail: String(t.detail || "").slice(0, 300),
          dept: deptId,
          agent,
          dependsOn: (t.dependsOn || []).filter((n) => n >= 0 && n < i).map((n) => ids[n]),
          etaMinutes: Math.min(60, Math.max(2, Math.round(Number(t.etaMinutes) || 10))),
          status: "queued" as const,
          goal: clean,
        };
      });
    return { id: uid("plan"), goal: clean, summary: String(raw.summary || clean), tasks, createdAt: new Date().toISOString(), source: "ai" };
  }

  return templatePlan(clean);
}

function templatePlan(goal: string): Plan {
  const g = goal.replace(/[.!?]+$/, "");
  const lower = g.toLowerCase();
  const wantsSales = /lead|sale|pipeline|customer|revenue|outreach|deal|b2b|demo/.test(lower);
  const wantsLaunch = /launch|release|campaign|announce|grow|audience|brand/.test(lower);

  const steps: Omit<PlanTask, "id" | "dependsOn" | "status" | "goal">[] & { deps?: number[] }[] = [];
  const add = (dept: DeptId, agent: string, title: string, detail: string, etaMinutes: number, deps: number[] = []) =>
    steps.push({ dept, agent, title, detail, etaMinutes, deps } as never);

  add("intelligence", "intel.market", "Scan the market around the goal", `Collect launches, pricing changes and conversations related to "${g}".`, 8);
  add("intelligence", "intel.competitor", "Refresh competitor briefs", "Update positioning, pricing and recent moves for the top three rivals.", 12, [0]);
  if (wantsLaunch || !wantsSales) {
    add("marketing", "trend-rider", "Pick angles that are working now", "Shortlist three hooks with evidence from the market scan.", 6, [0]);
    add("marketing", "content-writer", "Draft the campaign content", "One hero post, a three-part story and a short reel script, queued for approval.", 15, [1, 2]);
    add("marketing", "content-calendar", "Schedule the campaign", "Slot approved pieces into peak windows across the next seven days.", 4, [3]);
  }
  if (wantsSales || !wantsLaunch) {
    add("sales", "sales.prospector", "Build a target lead list", "Find 25 accounts that match the ICP and show intent this month.", 14, [1]);
    add("intelligence", "intel.scorer", "Score and rank the leads", "Rank by fit and intent so outreach starts with the best ten.", 5, [steps.length - 1]);
    add("sales", "sales.outreach", "Write the outreach sequence", "A four-step personalised sequence for the top ten leads.", 10, [steps.length - 1]);
  }
  add("operations", "ops.router", "Assign owners and deadlines", "Turn every step into an owned task and watch for blockers.", 3, [0]);
  add("operations", "ops.reporter", "Report outcomes", "Write a one-page summary of what shipped, what moved and what is next.", 6, [steps.length - 2]);

  const ids = steps.map(() => uid("t"));
  const tasks: PlanTask[] = steps.map((s, i) => {
    const { deps = [], ...rest } = s as typeof s & { deps?: number[] };
    return { ...rest, id: ids[i], dependsOn: deps.filter((n) => n < i).map((n) => ids[n]), status: "queued", goal };
  });

  return {
    id: uid("plan"),
    goal,
    summary: `${tasks.length} tasks across ${new Set(tasks.map((t) => t.dept)).size} departments to ${g.charAt(0).toLowerCase()}${g.slice(1)}.`,
    tasks,
    createdAt: new Date().toISOString(),
    source: "template",
  };
}

/* ------------------------------------------------------------------ */
/* Department agents                                                   */
/* ------------------------------------------------------------------ */

export async function runDeptAgent(agent: string, input: Record<string, string>): Promise<DeptAgentResult> {
  switch (agent) {
    case "sales.prospector":
      return prospect(input.icp || "B2B SaaS teams of 20 to 200 people");
    case "sales.outreach":
      return outreach(input.company || "Acme", input.contact || "there", input.offer || "AutonomOS");
    case "intel.competitor":
      return competitor(input.name || "Rival");
    case "ops.reporter":
      return report(input.context || "");
    default:
      throw new Error(`Unknown agent: ${agent}`);
  }
}

async function prospect(icp: string): Promise<DeptAgentResult> {
  type Raw = { leads?: Partial<Lead>[] };
  const raw = extractJSON<Raw>(
    await callAI(
      `You are the Prospector agent in AutonomOS. Suggest 6 illustrative, clearly fictional
example accounts that fit this ideal customer profile. Do not name real companies or people.
ICP: """${icp.slice(0, 400)}"""
Reply with JSON only: {"leads":[{"company":"","contact":"","title":"","fit":0-100,"reason":"one sentence, no em dashes"}]}`,
      "sales.prospector",
      { maxTokens: 1500 },
    ),
  );
  if (raw?.leads?.length) {
    return {
      kind: "leads",
      source: "ai",
      leads: raw.leads.slice(0, 8).map((l) => ({
        id: uid("lead"),
        company: String(l.company || "Unnamed"),
        contact: String(l.contact || "Unknown"),
        title: String(l.title || ""),
        fit: Math.max(0, Math.min(100, Math.round(Number(l.fit) || 60))),
        reason: String(l.reason || ""),
      })),
    };
  }

  const rnd = seeded(icp);
  const a = ["Northwind", "Brightline", "Copperleaf", "Lumen", "Fieldnote", "Harbor", "Quillstack", "Tidewater", "Parallax", "Ember"];
  const b = ["Labs", "Systems", "Health", "Logistics", "Studio", "Cloud", "Analytics", "Works"];
  const first = ["Maya", "Arjun", "Lena", "Diego", "Priya", "Sam", "Noor", "Theo", "Isha", "Jonah"];
  const last = ["Patel", "Okafor", "Lindqvist", "Moreau", "Shah", "Reyes", "Kim", "Duarte"];
  const titles = ["Head of Growth", "VP Sales", "COO", "Founder", "Director of Marketing", "RevOps Lead"];
  const reasons = [
    "Hiring two SDRs this quarter, a sign outbound is a priority.",
    "Just raised a seed round and is scaling the go-to-market team.",
    "Runs content on three channels with a one-person marketing team.",
    "Recently switched CRM, so workflows are being rebuilt now.",
    "Posted about manual reporting eating their Fridays.",
    "Expanding into a second region next quarter.",
  ];
  const leads: Lead[] = Array.from({ length: 6 }, () => ({
    id: uid("lead"),
    company: `${pick(rnd, a)} ${pick(rnd, b)}`,
    contact: `${pick(rnd, first)} ${pick(rnd, last)}`,
    title: pick(rnd, titles),
    fit: 55 + Math.floor(rnd() * 44),
    reason: pick(rnd, reasons),
  })).sort((x, y) => y.fit - x.fit);
  return { kind: "leads", leads, source: "template" };
}

async function outreach(company: string, contact: string, offer: string): Promise<DeptAgentResult> {
  type Raw = { steps?: Partial<SequenceStep>[] };
  const raw = extractJSON<Raw>(
    await callAI(
      `You are the Outreach Writer agent in AutonomOS. Write a 4-step cold email sequence.
Prospect: ${contact} at ${company}. Offer: ${offer}.
Each email under 90 words, specific, warm, no hype, no em dashes.
Reply with JSON only: {"steps":[{"day":1,"subject":"","body":""}]}`,
      "sales.outreach",
      { maxTokens: 1800 },
    ),
  );
  if (raw?.steps?.length) {
    return {
      kind: "sequence",
      source: "ai",
      steps: raw.steps.slice(0, 5).map((s, i) => ({ day: Number(s.day) || i * 3 + 1, subject: String(s.subject || ""), body: String(s.body || "") })),
    };
  }
  const name = contact.split(" ")[0] || "there";
  return {
    kind: "sequence",
    source: "template",
    steps: [
      { day: 1, subject: `${company} + an agent team for the busywork`, body: `Hi ${name},\n\nNoticed ${company} is growing the go-to-market team. ${offer} plans the work, hands it to AI agents across marketing, sales and ops, and asks you to approve before anything ships.\n\nWorth a 15 minute look next week?` },
      { day: 3, subject: "The Friday report, written for you", body: `Hi ${name},\n\nOne concrete example: the Reporter agent turns the week's real outcomes into a one-page summary every Friday. Most teams get an afternoon back.\n\nHappy to send a sample built on public info about ${company}.` },
      { day: 7, subject: "Quick sample for " + company, body: `Hi ${name},\n\nI put together a short competitor brief for ${company} using our Intelligence agents. No strings attached. Want me to send it over?` },
      { day: 12, subject: "Closing the loop", body: `Hi ${name},\n\nI will stop here so I am not clogging your inbox. If an orchestrated agent team ever moves up the list, reply with "later" and I will check back next quarter.` },
    ],
  };
}

async function competitor(name: string): Promise<DeptAgentResult> {
  const clean = name.trim().slice(0, 80) || "Rival";
  type Raw = Partial<CompetitorBrief>;
  const raw = extractJSON<Raw>(
    await callAI(
      `You are the Competitor Watch agent in AutonomOS. Write a concise competitor brief on "${clean}".
If you do not know this company, say so in positioning and keep every field clearly hypothetical.
No em dashes.
Reply with JSON only: {"positioning":"","pricing":"","strengths":["",""],"weaknesses":["",""],"moves":["",""],"threat":"low|medium|high"}`,
      "intel.competitor",
      { maxTokens: 1200 },
    ),
  );
  const base = { id: uid("comp"), name: clean, updatedAt: new Date().toISOString() };
  if (raw?.positioning) {
    const threat = raw.threat === "high" || raw.threat === "low" ? raw.threat : "medium";
    return {
      kind: "brief",
      source: "ai",
      brief: {
        ...base,
        positioning: String(raw.positioning),
        pricing: String(raw.pricing || "Unknown"),
        strengths: (raw.strengths || []).map(String).slice(0, 4),
        weaknesses: (raw.weaknesses || []).map(String).slice(0, 4),
        moves: (raw.moves || []).map(String).slice(0, 4),
        threat,
      },
    };
  }
  const rnd = seeded(clean);
  return {
    kind: "brief",
    source: "template",
    brief: {
      ...base,
      positioning: pick(rnd, [
        `${clean} sells a single-purpose AI assistant aimed at marketing teams.`,
        `${clean} positions itself as workflow automation with AI added on top.`,
        `${clean} targets enterprise ops teams with a heavy services layer.`,
      ]),
      pricing: pick(rnd, ["Per seat, from $49 a month", "Usage based with a $299 platform fee", "Annual contracts only, sales-led"]),
      strengths: [pick(rnd, ["Strong brand in its niche", "Large integrations catalogue", "Fast onboarding"]), pick(rnd, ["Active community", "Good docs", "Enterprise logos"])],
      weaknesses: [pick(rnd, ["No cross-department planning", "Humans still route every task", "Opaque pricing"]), pick(rnd, ["No approval step before publishing", "Locked to one model vendor", "Slow release cadence"])],
      moves: [pick(rnd, ["Launched an agents beta last month", "Raised prices on the starter plan", "Hired a new VP Marketing"]), pick(rnd, ["Announced a partner program", "Started a weekly webinar series", "Shipped a Zapier integration"])],
      threat: pick(rnd, ["low", "medium", "medium", "high"] as const),
    },
  };
}

async function report(context: string): Promise<DeptAgentResult> {
  type Raw = Partial<OpsReport>;
  const raw = extractJSON<Raw>(
    await callAI(
      `You are the Reporter agent in AutonomOS. Write this week's one-page operating report from the facts below.
Facts: """${context.slice(0, 3000)}"""
Be concrete, use the numbers given, no em dashes.
Reply with JSON only: {"headline":"","wins":["",""],"risks":["",""],"next":["",""]}`,
      "ops.reporter",
      { maxTokens: 1200 },
    ),
  );
  if (raw?.headline) {
    return {
      kind: "report",
      source: "ai",
      report: {
        headline: String(raw.headline),
        wins: (raw.wins || []).map(String).slice(0, 5),
        risks: (raw.risks || []).map(String).slice(0, 5),
        next: (raw.next || []).map(String).slice(0, 5),
      },
    };
  }
  const nums = context.match(/\d+/g) || [];
  return {
    kind: "report",
    source: "template",
    report: {
      headline: nums.length ? `A productive week: ${nums[0]} tasks closed across the company.` : "A steady week across all four departments.",
      wins: ["Marketing kept the calendar full with every post approved before publishing.", "Sales moved two deals into proposal.", "Intelligence refreshed every competitor brief."],
      risks: ["Outreach replies are slower than last week; test a shorter first email.", "Two tasks have waited on review for more than a day."],
      next: ["Run the Prospector on the new ICP segment.", "Ship the campaign drafted this week.", "Clear the review queue before Monday."],
    },
  };
}
