import { NextRequest, NextResponse } from "next/server";
import { runAgents, summarize, checkCronAuth } from "@/lib/agent-runner";
import { publishDueContent } from "@/lib/publish";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Morning batch, timed to land shortly before the lunch peak window
 * (12:00-14:00 IST, see lib/schedule.ts). Vercel's free plan caps a project
 * at a couple of cron jobs fired once a day each, so this does double duty:
 * whatever approved content is due now that this window has arrived, then
 * the day's content-generation agents - there was no spare slot for a cron
 * dedicated to publish-checking alone. Publishing runs first: it is the
 * time-sensitive half of this request, where generation is not, and both
 * share one 60s ceiling.
 */
export async function GET(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const publishing = await publishDueContent();

  const day = new Date().getUTCDay();
  const agents = ["content-writer", "story-generator"];

  if (day === 1) agents.push("content-calendar");
  if (day === 2 || day === 4) agents.push("illustration-studio");

  const results = await runAgents(agents);
  const summary = summarize(results);

  return NextResponse.json({
    message: `Morning batch complete: ${summary.count} items, ${publishing.published} of ${publishing.due} due pieces published`,
    day: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][day],
    ...summary,
    publishing,
  });
}
