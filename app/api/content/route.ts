import { NextRequest, NextResponse } from "next/server";
import { getContent , isStoreConfigured } from "@/lib/store";
import { stripArt } from "@/lib/design-system";


export const dynamic = "force-dynamic";

/**
 * Lists stored content. Without this the dashboard could only ever show items
 * generated in the current browser session - anything a cron produced was
 * invisible.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");
    const status = searchParams.get("status");
    const months = Number(searchParams.get("months") || 2);

    let items = await getContent(Number.isFinite(months) ? months : 2);
    if (agentId) items = items.filter((c) => c.agentId === agentId);
    if (status) items = items.filter((c) => c.status === status);

    return NextResponse.json({
      content: items.map(stripArt),
      count: items.length,
      storeConfigured: isStoreConfigured(),
    });
  } catch (error: any) {
    console.error("Content list error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list content", content: [] },
      { status: 500 }
    );
  }
}
