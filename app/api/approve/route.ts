import { NextRequest, NextResponse } from "next/server";
import { patchContent } from "@/lib/store";
import { nextPeakTime } from "@/lib/schedule";
import { stripArt } from "@/lib/design-system";

export async function POST(req: NextRequest) {
  try {
    const { id, action, scheduledFor } = await req.json();

    if (!id || !["approve", "reject", "publish", "reschedule"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    let patch: Parameters<typeof patchContent>[1];

    if (action === "approve") {
      // Approving schedules the actual Instagram post for the next peak
      // window rather than leaving it to post whenever an operator happened to
      // be reviewing the queue - the morning/midday crons pick it up once it's
      // due.
      patch = { status: "approved", scheduledFor: nextPeakTime().toISOString() };
    } else if (action === "reschedule") {
      // An operator picking their own time for an already-approved piece.
      const t = new Date(scheduledFor);
      if (!scheduledFor || isNaN(t.getTime())) {
        return NextResponse.json({ error: "Invalid schedule time" }, { status: 400 });
      }
      patch = { status: "approved", scheduledFor: t.toISOString() };
    } else {
      // Reject/publish don't touch the schedule.
      patch = { status: action === "reject" ? "rejected" : "published" };
    }

    const updated = await patchContent(id, patch);

    if (!updated) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Freedom artwork is server-side only: the dashboard gets a count, not the SVGs.
    return NextResponse.json({ content: stripArt(updated) });
  } catch (error: any) {
    console.error("Approve error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update content" },
      { status: 500 }
    );
  }
}
