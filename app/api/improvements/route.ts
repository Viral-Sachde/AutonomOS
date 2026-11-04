import { NextRequest, NextResponse } from "next/server";
import { generateImprovements } from "@/lib/ai";
import { flushHistory } from "@/lib/history";
import { addImprovement, updateImprovementStatus, getImprovements } from "@/lib/store";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ improvements: await getImprovements() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "generate") {
      const improvements = await generateImprovements();
      for (const i of improvements) await addImprovement(i);
      await flushHistory();
      return NextResponse.json({ improvements });
    }

    if (["approve", "reject", "push"].includes(body.action) && body.id) {
      const status = body.action === "push" ? "pushed" : `${body.action}d`;
      const updated = await updateImprovementStatus(body.id, status as any);
      if (!updated) {
        return NextResponse.json({ error: "Improvement not found" }, { status: 404 });
      }

      if (body.action === "push" && process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
        // Marking it pushed records the decision; opening the actual PR against
        // the game repo is not wired up yet.
        console.log(`Improvement ${body.id} marked for ${process.env.GITHUB_REPO}`);
      }

      return NextResponse.json({ improvement: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Improvements error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process improvement" },
      { status: 500 }
    );
  }
}
