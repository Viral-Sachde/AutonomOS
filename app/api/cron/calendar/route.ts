import { NextRequest, NextResponse } from "next/server";
import { runAgents, summarize, checkCronAuth } from "@/lib/agent-runner";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const AGENT_ID = "content-calendar";

/** Scheduled run. Skipped silently when the operator has switched the agent off. */
export async function GET(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const summary = summarize(await runAgents([AGENT_ID]));
  return NextResponse.json({
    message: `${AGENT_ID}: ${summary.count} items`,
    agentId: AGENT_ID,
    ...summary,
  });
}

/**
 * Manual run from the dashboard. Carries the operator's own idea through as
 * steer, and forces the run so a switched-off agent can still be fired by hand.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const summary = summarize(
      await runAgents([AGENT_ID], {
        steer: typeof body.steer === "string" ? body.steer : undefined,
        force: true,
        allowDuplicates: body.allowDuplicates === true,
      })
    );
    return NextResponse.json({
      message: `${AGENT_ID}: ${summary.count} items`,
      agentId: AGENT_ID,
      ...summary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
