import { NextRequest, NextResponse } from "next/server";
import { agentConfigs } from "@/lib/design-system";
import { getAgentStates, setAgentEnabled } from "@/lib/agent-settings";
import { getContent , isStoreConfigured } from "@/lib/store";

import { providerStatus } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

/** Agent catalogue joined with persisted on/off state and output counts. */
export async function GET() {
  try {
    const [states, content] = await Promise.all([getAgentStates(), getContent()]);

    const counts = new Map<string, number>();
    for (const item of content) {
      if (item.agentId) counts.set(item.agentId, (counts.get(item.agentId) || 0) + 1);
    }

    return NextResponse.json({
      agents: agentConfigs.map((a) => ({
        ...a,
        enabled: states[a.id]?.enabled ?? a.enabled,
        lastRun: states[a.id]?.lastRun,
        lastCount: states[a.id]?.lastCount,
        lastError: states[a.id]?.lastError,
        itemsGenerated: counts.get(a.id) || 0,
      })),
      storeConfigured: isStoreConfigured(),
      ai: providerStatus(),
    });
  } catch (error: any) {
    console.error("Agents list error:", error);
    return NextResponse.json({ error: error.message, agents: [] }, { status: 500 });
  }
}

/** Toggles one agent on or off. Disabled agents are skipped by the crons. */
export async function POST(req: NextRequest) {
  try {
    const { id, enabled } = await req.json();

    if (!id || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Both id and a boolean enabled are required" },
        { status: 400 }
      );
    }
    if (!agentConfigs.some((a) => a.id === id)) {
      return NextResponse.json({ error: `Unknown agent: ${id}` }, { status: 404 });
    }

    const states = await setAgentEnabled(id, enabled);
    return NextResponse.json({ id, enabled: states[id].enabled, states });
  } catch (error: any) {
    console.error("Agent toggle error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
