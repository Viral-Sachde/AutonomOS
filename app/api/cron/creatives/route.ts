import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/agent-runner";
import { publishDueScheduled, Slot } from "@/lib/scheduled-creatives";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SLOTS: Slot[] = ["post", "reel", "story"];

/**
 * Posts the pre-made week of creatives. vercel.json fires this three times a
 * day (3pm post, 6pm reel, 8pm story IST) with ?slot=post|reel|story, so each
 * call only handles its own format. Without ?slot it handles anything due.
 */
export async function GET(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const param = req.nextUrl.searchParams.get("slot");
  if (param && !SLOTS.includes(param as Slot)) {
    return NextResponse.json({ error: `slot must be one of ${SLOTS.join(", ")}` }, { status: 400 });
  }

  const outcome = await publishDueScheduled((param as Slot) || null);
  return NextResponse.json(outcome, { status: outcome.error ? 500 : 200 });
}
