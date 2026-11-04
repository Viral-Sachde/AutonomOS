import { NextRequest, NextResponse } from "next/server";
import { runDeptAgent, orchestratorUsesAI } from "@/lib/orchestrator";

export const dynamic = "force-dynamic";

/** POST {agent, input} -> structured output from one department agent. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const agent = typeof body.agent === "string" ? body.agent : "";
  const raw = body.input && typeof body.input === "object" ? body.input : {};
  const input: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") input[k] = v.slice(0, 3000);
  try {
    const result = await runDeptAgent(agent, input);
    return NextResponse.json({ result, demo: !orchestratorUsesAI() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Agent failed" }, { status: 400 });
  }
}
