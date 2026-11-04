import { getSupabase, isSupabaseConfigured } from "./supabase";
import { kv, isRedisConfigured } from "./redis";

export interface UsageEntry {
  id: string;
  agentId: string;
  model: string;
  provider: "claude" | "gemini" | "none";
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: string;
}

const USAGE_KEY = "rn:usage";

const memBag = globalThis as unknown as { __rnUsage?: UsageEntry[] };
memBag.__rnUsage ||= [];

const PRICING: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5":         { input: 0.80,  output: 4.00  },
  "claude-haiku-4-5-latest":  { input: 0.80,  output: 4.00  },
  "claude-sonnet-4-5":        { input: 3.00,  output: 15.00 },
  "claude-sonnet-4-5-latest": { input: 3.00,  output: 15.00 },
  "claude-sonnet-5":          { input: 3.00,  output: 15.00 },
  "claude-sonnet-5-latest":   { input: 3.00,  output: 15.00 },
  "claude-opus-5":            { input: 15.00, output: 75.00 },
  "claude-opus-5-latest":     { input: 15.00, output: 75.00 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = PRICING[model];
  if (!rates) return 0;
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

export async function recordUsage(entry: UsageEntry): Promise<void> {
  const db = getSupabase();
  if (db) {
    try {
      const { error } = await db.from("usage_log").insert({
        id: entry.id,
        agent_id: entry.agentId,
        model: entry.model,
        provider: entry.provider,
        input_tokens: entry.inputTokens,
        output_tokens: entry.outputTokens,
        cost_usd: entry.costUsd,
        created_at: entry.createdAt,
      });
      if (error) throw new Error(error.message);
      return;
    } catch (e) {
      console.error("Could not record usage to Supabase, falling back:", e);
    }
  }

  if (isRedisConfigured()) {
    try {
      const all = await kv.lrange<UsageEntry>(USAGE_KEY, 0, -1);
      await kv.lpush(USAGE_KEY, entry);
      if ((all?.length || 0) > 500) await kv.ltrim(USAGE_KEY, 0, 499);
      return;
    } catch (e) {
      console.error("Could not record usage to Redis, falling back:", e);
    }
  }

  memBag.__rnUsage!.push(entry);
  if (memBag.__rnUsage!.length > 500) memBag.__rnUsage!.splice(0, memBag.__rnUsage!.length - 500);
}

function toEntry(row: any): UsageEntry {
  return {
    id: row.id,
    agentId: row.agent_id || row.agentId || "",
    model: row.model || "",
    provider: row.provider || "claude",
    inputTokens: row.input_tokens ?? row.inputTokens ?? 0,
    outputTokens: row.output_tokens ?? row.outputTokens ?? 0,
    costUsd: row.cost_usd ?? row.costUsd ?? 0,
    createdAt: row.created_at || row.createdAt || "",
  };
}

export async function getUsage(days = 30): Promise<UsageEntry[]> {
  const db = getSupabase();
  if (db) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await db
        .from("usage_log")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) throw new Error(error.message);
      return (data || []).map(toEntry);
    } catch (e) {
      console.error("Could not load usage from Supabase, falling back:", e);
    }
  }

  if (isRedisConfigured()) {
    try {
      const all = await kv.lrange<UsageEntry>(USAGE_KEY, 0, 499);
      if (!all) return [];
      const since = new Date();
      since.setDate(since.getDate() - days);
      return all
        .map(toEntry)
        .filter((u) => new Date(u.createdAt) >= since);
    } catch (e) {
      console.error("Could not load usage from Redis, falling back:", e);
    }
  }

  return [...(memBag.__rnUsage || [])].reverse();
}

export interface UsageSummary {
  totalCost: number;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byAgent: Record<string, { calls: number; cost: number }>;
  byModel: Record<string, { calls: number; cost: number; inputTokens: number; outputTokens: number }>;
  byDay: { date: string; cost: number; calls: number }[];
  entries: UsageEntry[];
}

export function summarizeUsage(entries: UsageEntry[]): UsageSummary {
  const byAgent: Record<string, { calls: number; cost: number }> = {};
  const byModel: Record<string, { calls: number; cost: number; inputTokens: number; outputTokens: number }> = {};
  const dayMap: Record<string, { cost: number; calls: number }> = {};

  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const e of entries) {
    totalCost += e.costUsd;
    totalInputTokens += e.inputTokens;
    totalOutputTokens += e.outputTokens;

    const agentKey = e.agentId || "manual";
    if (!byAgent[agentKey]) byAgent[agentKey] = { calls: 0, cost: 0 };
    byAgent[agentKey].calls++;
    byAgent[agentKey].cost += e.costUsd;

    if (!byModel[e.model]) byModel[e.model] = { calls: 0, cost: 0, inputTokens: 0, outputTokens: 0 };
    byModel[e.model].calls++;
    byModel[e.model].cost += e.costUsd;
    byModel[e.model].inputTokens += e.inputTokens;
    byModel[e.model].outputTokens += e.outputTokens;

    const day = e.createdAt.slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { cost: 0, calls: 0 };
    dayMap[day].cost += e.costUsd;
    dayMap[day].calls++;
  }

  const byDay = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  return {
    totalCost,
    totalCalls: entries.length,
    totalInputTokens,
    totalOutputTokens,
    byAgent,
    byModel,
    byDay,
    entries,
  };
}
