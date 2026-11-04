import { agentConfigs } from "./design-system";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { kv, isRedisConfigured } from "./redis";

const AGENT_STATE_KEY = "rn:agent-state";

export interface AgentState {
  enabled: boolean;
  lastRun?: string;
  lastCount?: number;
  lastError?: string;
}

export type AgentStates = Record<string, AgentState>;

const memBag = globalThis as unknown as { __rnAgentStates?: AgentStates };

function defaults(): AgentStates {
  return Object.fromEntries(agentConfigs.map((a) => [a.id, { enabled: a.enabled }]));
}

export async function getAgentStates(): Promise<AgentStates> {
  const db = getSupabase();
  if (db) {
    try {
      const { data, error } = await db.from("agent_state").select("*");
      if (error) throw new Error(error.message);

      const states = defaults();
      for (const row of data || []) {
        states[row.agent_id] = {
          enabled: row.enabled,
          lastRun: row.last_run || undefined,
          lastCount: row.last_count ?? undefined,
          lastError: row.last_error || undefined,
        };
      }
      return states;
    } catch (e) {
      console.error("Could not load agent state from Supabase, using defaults:", e);
    }
  }

  if (isRedisConfigured()) {
    const stored = await kv.hgetall<AgentStates>(AGENT_STATE_KEY);
    const states = defaults();
    if (stored) Object.assign(states, stored);
    return states;
  }

  memBag.__rnAgentStates ||= defaults();
  return memBag.__rnAgentStates;
}

export async function isAgentEnabled(agentId: string): Promise<boolean> {
  const states = await getAgentStates();
  return states[agentId]?.enabled ?? true;
}

export async function setAgentEnabled(
  agentId: string,
  enabled: boolean
): Promise<AgentStates> {
  return patchAgent(agentId, { enabled });
}

export async function recordAgentRun(
  agentId: string,
  count: number,
  error?: string
): Promise<void> {
  try {
    await patchAgent(agentId, {
      lastRun: new Date().toISOString(),
      lastCount: count,
      lastError: error,
    });
  } catch (e) {
    console.error(`Could not record run for ${agentId}:`, e);
  }
}

async function patchAgent(
  agentId: string,
  patch: Partial<AgentState>
): Promise<AgentStates> {
  const db = getSupabase();
  if (db) {
    try {
      const current = await getAgentStates();
      const merged = { ...(current[agentId] || { enabled: true }), ...patch };

      const { error } = await db.from("agent_state").upsert({
        agent_id: agentId,
        enabled: merged.enabled,
        last_run: merged.lastRun ?? null,
        last_count: merged.lastCount ?? null,
        last_error: merged.lastError ?? null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);

      return { ...current, [agentId]: merged };
    } catch (e) {
      console.error(`Could not save agent state to Supabase, falling back:`, e);
    }
  }

  if (isRedisConfigured()) {
    const states = await getAgentStates();
    const merged = { ...(states[agentId] || { enabled: true }), ...patch };
    await kv.hset(AGENT_STATE_KEY, { [agentId]: merged });
    return { ...states, [agentId]: merged };
  }

  memBag.__rnAgentStates ||= defaults();
  memBag.__rnAgentStates[agentId] = {
    ...(memBag.__rnAgentStates[agentId] || { enabled: true }),
    ...patch,
  };
  return memBag.__rnAgentStates;
}

export function isSettingsPersisted(): boolean {
  return isSupabaseConfigured() || isRedisConfigured();
}
