import { NextRequest, NextResponse } from "next/server";
import {
  getScheduleView,
  loadSchedule,
  publishScheduledItem,
  isSchedulePaused,
  setSchedulePaused,
} from "@/lib/scheduled-creatives";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ items: await getScheduleView(), paused: await isSchedulePaused() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** { id } posts that item now (also how a missed slot is caught up); { paused } pauses or resumes the cron. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (typeof body.paused === "boolean") {
      await setSchedulePaused(body.paused);
      return NextResponse.json({ paused: body.paused });
    }

    const item = loadSchedule().find((i) => i.id === body.id);
    if (!item) return NextResponse.json({ error: "Unknown item" }, { status: 404 });

    const result = await publishScheduledItem(item);
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
