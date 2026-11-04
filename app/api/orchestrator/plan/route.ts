import { NextRequest, NextResponse } from "next/server";
import { planGoal, orchestratorUsesAI } from "@/lib/orchestrator";

export const dynamic = "force-dynamic";

/** POST {goal} -> a plan of delegated tasks across the four departments. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const goal = typeof body.goal === "string" ? body.goal.trim() : "";
  if (!goal) return NextResponse.json({ error: "Give the orchestrator a goal." }, { status: 400 });
  const plan = await planGoal(goal, typeof body.steer === "string" ? body.steer : undefined);
  return NextResponse.json({ plan, demo: !orchestratorUsesAI() });
}
