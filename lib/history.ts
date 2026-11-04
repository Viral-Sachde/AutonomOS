import { ContentType, themes, roles } from "./design-system";
import { getSupabase } from "./supabase";
import { kv, isRedisConfigured } from "./redis";

/**
 * Anti-repetition memory. This only works if it survives restarts - an empty
 * history makes every prompt look like the first one, which is exactly the
 * "why does it keep writing the same post" failure mode.
 */
const KEEP = 120; // rolling window; the prompts only ever read the last ~20

interface UsageRecord {
  theme: string;
  roleId: string;
  type: ContentType;
  hook: string;
  designVariant: string;
  createdAt: string;
}

interface ImprovementRecord {
  title: string;
  category: string;
  createdAt: string;
}

// Hung off globalThis for the same reason as lib/store.ts - anti-repetition is
// worthless if each route handler keeps its own private history.
const histBag = globalThis as unknown as {
  __rnUsage?: UsageRecord[];
  __rnImprovementHistory?: ImprovementRecord[];
};
histBag.__rnUsage ||= [];
histBag.__rnImprovementHistory ||= [];

let usageHistory: UsageRecord[] = histBag.__rnUsage;
let improvementHistory: ImprovementRecord[] = histBag.__rnImprovementHistory;
let loaded = false;
let dirty = false;

/**
 * Pulls persisted history into module state. Every entry point that reads or
 * writes history calls this first; it is a no-op after the first call within
 * an instance's lifetime.
 */
export async function loadHistory(): Promise<void> {
  if (loaded) return;

  const db = getSupabase();
  if (db) {
    try {
      const { data, error } = await db
        .from("usage_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(KEEP * 2);
      if (error) throw new Error(error.message);

      const rows = (data || []).slice().reverse();

      usageHistory = rows
        .filter((r: any) => r.kind === "content")
        .map((r: any) => ({
          theme: r.theme || "",
          roleId: r.role_id || "",
          type: r.type,
          hook: r.hook || "",
          designVariant: r.design_variant || "",
          createdAt: r.created_at,
        }));
      improvementHistory = rows
        .filter((r: any) => r.kind === "improvement")
        .map((r: any) => ({
          title: r.title || "",
          category: r.category || "",
          createdAt: r.created_at,
        }));

      histBag.__rnUsage = usageHistory;
      histBag.__rnImprovementHistory = improvementHistory;
    } catch (e) {
      console.error("Could not load history, starting empty:", e);
    }
    loaded = true;
    return;
  }

  if (isRedisConfigured()) {
    try {
      const stored = await kv.get<{ usage: UsageRecord[]; improvements: ImprovementRecord[] }>("rn:history");
      if (stored) {
        usageHistory = stored.usage || [];
        improvementHistory = stored.improvements || [];
        histBag.__rnUsage = usageHistory;
        histBag.__rnImprovementHistory = improvementHistory;
      }
    } catch (e) {
      console.error("Could not load history from Redis, starting empty:", e);
    }
  }

  loaded = true;
}

/** Rows added since the last flush; only these are written. */
let pendingUsage: UsageRecord[] = [];
let pendingImprovements: ImprovementRecord[] = [];

async function persist(): Promise<void> {
  const db = getSupabase();
  if (db) {
    const rows = [
      ...pendingUsage.map((r) => ({
        kind: "content",
        theme: r.theme,
        role_id: r.roleId,
        type: r.type,
        hook: r.hook,
        design_variant: r.designVariant,
        created_at: r.createdAt,
      })),
      ...pendingImprovements.map((r) => ({
        kind: "improvement",
        title: r.title,
        category: r.category,
        created_at: r.createdAt,
      })),
    ];
    pendingUsage = [];
    pendingImprovements = [];
    if (rows.length === 0) return;

    try {
      const { error } = await db.from("usage_history").insert(rows);
      if (error) throw new Error(error.message);
      return;
    } catch (e) {
      console.error("Could not persist history to Supabase, falling back:", e);
    }
  }

  if (isRedisConfigured()) {
    pendingUsage = [];
    pendingImprovements = [];
    try {
      const trimmedUsage = usageHistory.slice(-KEEP);
      const trimmedImprovements = improvementHistory.slice(-KEEP);
      await kv.set("rn:history", { usage: trimmedUsage, improvements: trimmedImprovements });
    } catch (e) {
      console.error("Could not persist history to Redis:", e);
    }
    return;
  }

  pendingUsage = [];
  pendingImprovements = [];
}

/**
 * Records are pushed synchronously so they can be called from inside plain
 * `.map()` callbacks; the write to the content repo is deferred to
 * `flushHistory()`. Callers must flush once at the end of a run - that also
 * keeps a batch of items to a single commit instead of one commit each.
 */
export function recordContentUsage(record: Omit<UsageRecord, "createdAt">) {
  const row = { ...record, createdAt: new Date().toISOString() };
  usageHistory.push(row);
  pendingUsage.push(row);
  dirty = true;
}

export function recordImprovementUsage(title: string, category: string) {
  const row = { title, category, createdAt: new Date().toISOString() };
  improvementHistory.push(row);
  pendingImprovements.push(row);
  dirty = true;
}

export async function flushHistory(): Promise<void> {
  if (!dirty) return;
  dirty = false;
  await persist();
}

export function getRecentThemes(limit = 10): string[] {
  return usageHistory
    .slice(-limit)
    .map((r) => r.theme)
    .filter(Boolean);
}

export function getRecentRoles(limit = 10): string[] {
  return usageHistory
    .slice(-limit)
    .map((r) => r.roleId)
    .filter(Boolean);
}

export function getRecentHooks(limit = 20): string[] {
  return usageHistory
    .slice(-limit)
    .map((r) => r.hook)
    .filter(Boolean);
}

export function getRecentImprovementTitles(limit = 30): string[] {
  return improvementHistory
    .slice(-limit)
    .map((r) => r.title);
}

export function pickFreshTheme(): string {
  const recent = getRecentThemes(5);
  const available = (themes as readonly string[]).filter((t) => !recent.includes(t));
  if (available.length === 0) {
    return themes[Math.floor(Math.random() * themes.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

export function pickFreshRole() {
  const recent = getRecentRoles(4);
  const available = roles.filter((r) => !recent.includes(r.id));
  if (available.length === 0) {
    return roles[Math.floor(Math.random() * roles.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

const designVariants = [
  { id: "castle-moonrise", accent: "gold", motif: "castle silhouette with rising crescent moon", layout: "centered title, bottom landscape" },
  { id: "starfield-sigil", accent: "champagne", motif: "scattered star sigils on deep space background", layout: "diagonal text, corner sigils" },
  { id: "ruby-throne", accent: "strawberry-red", motif: "throne room shadows with ruby gem accents", layout: "split frame, dark to red gradient" },
  { id: "emerald-forest", accent: "emerald", motif: "enchanted forest path with glowing runes", layout: "vertical stack, nature border" },
  { id: "gold-manuscript", accent: "gold", motif: "aged manuscript page with gold leaf borders", layout: "parchment overlay, serif heavy" },
  { id: "twilight-tower", accent: "cool-steel", motif: "watchtower at twilight with fog", layout: "full bleed background, floating text" },
  { id: "blood-moon", accent: "strawberry-red", motif: "blood moon over battlements", layout: "circular focal point, radial text" },
  { id: "knight-vigil", accent: "champagne", motif: "armored figure in candlelight", layout: "portrait crop, warm vignette" },
  { id: "shadow-council", accent: "cool-steel", motif: "round table in shadows, chairs half-visible", layout: "wide format, moody lighting" },
  { id: "dawn-banner", accent: "gold", motif: "heraldic banner catching first light", layout: "flag shape overlay, bold serif" },
  { id: "crypt-reveal", accent: "emerald", motif: "torch-lit stone corridor with green glow", layout: "narrow frame, deep perspective" },
  { id: "crown-dagger", accent: "strawberry-red", motif: "crown and crossed daggers emblem", layout: "emblem centered, text wraps around" },
] as const;

export function pickDesignVariant() {
  const recentVariants = usageHistory.slice(-6).map((r) => r.designVariant);
  const available = designVariants.filter((v) => !recentVariants.includes(v.id));
  if (available.length === 0) {
    return designVariants[Math.floor(Math.random() * designVariants.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

export function buildHistoryContext(): string {
  if (usageHistory.length === 0) return "";

  const recentThemes = getRecentThemes(5);
  const recentRoles = getRecentRoles(5);
  const recentHooks = getRecentHooks(5);

  let context = "\n\nIMPORTANT: Avoid repeating recent content. Here is what was recently generated:";
  if (recentThemes.length) context += `\nRecent themes used: ${recentThemes.join(", ")}`;
  if (recentRoles.length) context += `\nRecent roles featured: ${recentRoles.join(", ")}`;
  if (recentHooks.length) context += `\nRecent hooks/opening lines: ${recentHooks.map(h => `"${h}"`).join(", ")}`;
  context += "\n\nGenerate something FRESH that uses different angles, hooks, and combinations than the above.";

  return context;
}

export function buildImprovementHistoryContext(): string {
  const recentTitles = getRecentImprovementTitles(15);
  if (recentTitles.length === 0) return "";

  return `\n\nIMPORTANT: Do NOT repeat these previously suggested improvements:\n${recentTitles.map(t => `- ${t}`).join("\n")}\n\nGenerate completely new ideas that are different from the above.`;
}
