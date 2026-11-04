import { NextRequest, NextResponse } from "next/server";
import { getUsage, summarizeUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const days = Number(req.nextUrl.searchParams.get("days") || "30");
    const entries = await getUsage(days);
    const summary = summarizeUsage(entries);

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Usage fetch error:", error);
    return NextResponse.json(
      { error: error.message, totalCost: 0, totalCalls: 0, entries: [], byAgent: {}, byModel: {}, byDay: [] },
      { status: 500 },
    );
  }
}
