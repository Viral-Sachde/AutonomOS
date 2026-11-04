import { NextRequest, NextResponse } from "next/server";
import { isAutoPublishEnabled } from "@/lib/publish";
import { setAgentEnabled } from "@/lib/agent-settings";

export const dynamic = "force-dynamic";

const AUTO_PUBLISH_ID = "auto-publish";

/** Whether the morning/midday crons are allowed to publish due content. */
export async function GET() {
  return NextResponse.json({ enabled: await isAutoPublishEnabled() });
}

export async function POST(req: NextRequest) {
  try {
    const { enabled } = await req.json();
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }
    const states = await setAgentEnabled(AUTO_PUBLISH_ID, enabled);
    return NextResponse.json({ enabled: states[AUTO_PUBLISH_ID].enabled });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
