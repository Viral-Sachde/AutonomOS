import { NextRequest, NextResponse } from "next/server";
import { runAgents, summarize, checkCronAuth } from "@/lib/agent-runner";
import { publishDueContent } from "@/lib/publish";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * The reactive and weekly-analysis agents, timed to land shortly before the
 * evening peak window (19:00-21:00 IST, see lib/schedule.ts) despite the
 * route's name - kept as "midday" rather than renamed, since renaming the
 * path means updating vercel.json's cron entry to match for no functional
 * gain. Also runs the publish-due check first, same reasoning as the
 * morning route: only two cron slots exist on the free plan, so each one
 * covers both publishing and generation for its time of day, publishing
 * first since it is the time-sensitive half.
 */
export async function GET(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const publishing = await publishDueContent();

  const day = new Date().getUTCDay();
  const agents = ["trend-rider"];

  if (day === 1) agents.push("analytics-reporter", "code-improver");
  if (day === 3) agents.push("concept-polisher");
  if (day === 5) agents.push("competitor-scout");

  const results = await runAgents(agents);
  const summary = summarize(results);

  return NextResponse.json({
    message: `Midday batch complete: ${summary.count} items, ${publishing.published} of ${publishing.due} due pieces published`,
    day: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][day],
    ...summary,
    publishing,
  });
}
