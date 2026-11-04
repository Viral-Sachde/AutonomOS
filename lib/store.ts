import { ContentItem, Improvement } from "./design-system";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { kv, isRedisConfigured } from "./redis";

/**
 * Storage layer with three backends checked in order:
 * 1. Supabase Postgres - if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 * 2. Redis (Vercel KV) - if KV_REST_API_URL + KV_REST_API_TOKEN are set
 * 3. In-memory fallback - for local dev only (dies on restart)
 */

const CONTENT_KEY = "rn:content";
const IMPROVEMENTS_KEY = "rn:improvements";

const mem = globalThis as unknown as {
  __rnContent?: ContentItem[];
  __rnImprovements?: Improvement[];
};
mem.__rnContent ||= [];
mem.__rnImprovements ||= [];

const memContent = mem.__rnContent;
const memImprovements = mem.__rnImprovements;

/* ------------------------------------------------------------------ *
 * Row mapping for Supabase (snake_case <-> camelCase)
 * ------------------------------------------------------------------ */

function toContent(row: any): ContentItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    caption: row.caption || "",
    hashtags: row.hashtags || [],
    slides: row.slides || undefined,
    storyFrames: row.story_frames || row.storyFrames || undefined,
    reelScript: row.reel_script || row.reelScript || undefined,
    durationSec: row.duration_sec ?? row.durationSec ?? undefined,
    accentColor: row.accent_color || row.accentColor || undefined,
    generationMode: row.generation_mode || row.generationMode || undefined,
    svgCode: row.svg_code || row.svgCode || undefined,
    imageUrls: row.image_urls || row.imageUrls || [],
    status: row.status,
    theme: row.theme || "",
    agentId: row.agent_id || row.agentId || undefined,
    illustrationCategory: row.illustration_category || row.illustrationCategory || undefined,
    platform: row.platform || undefined,
    scheduledFor: row.scheduled_for || row.scheduledFor || undefined,
    publishedAt: row.published_at || row.publishedAt || undefined,
    createdAt: row.created_at || row.createdAt,
    design: row.design || undefined,
  };
}

function fromContent(item: ContentItem): Record<string, unknown> {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    caption: item.caption,
    hashtags: item.hashtags,
    slides: item.slides ?? null,
    story_frames: item.storyFrames ?? null,
    reel_script: item.reelScript ?? null,
    duration_sec: item.durationSec ?? null,
    accent_color: item.accentColor ?? null,
    generation_mode: item.generationMode ?? null,
    svg_code: item.svgCode ?? null,
    image_urls: item.imageUrls ?? [],
    status: item.status,
    theme: item.theme,
    agent_id: item.agentId ?? null,
    illustration_category: item.illustrationCategory ?? null,
    platform: item.platform ?? null,
    scheduled_for: item.scheduledFor ?? null,
    published_at: item.publishedAt ?? null,
    created_at: item.createdAt,
    // Only sent when set, so a database that has not run the design migration
    // keeps working for everything that does not use it.
    ...(item.design ? { design: item.design } : {}),
  };
}

function patchColumns(patch: Partial<ContentItem>): Record<string, unknown> {
  const map: Record<keyof ContentItem, string> = {
    id: "id", type: "type", title: "title", caption: "caption",
    hashtags: "hashtags", slides: "slides", storyFrames: "story_frames",
    reelScript: "reel_script", durationSec: "duration_sec",
    accentColor: "accent_color", generationMode: "generation_mode",
    svgCode: "svg_code", imageUrls: "image_urls",
    status: "status", theme: "theme", agentId: "agent_id",
    illustrationCategory: "illustration_category", platform: "platform",
    scheduledFor: "scheduled_for", publishedAt: "published_at",
    createdAt: "created_at", design: "design",
  };

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const column = map[key as keyof ContentItem];
    if (column) out[column] = value;
  }
  return out;
}

function toImprovement(row: any): Improvement {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    category: row.category,
    priority: row.priority,
    filesToChange: row.files_to_change || row.filesToChange || undefined,
    codeChanges: row.code_changes || row.codeChanges || undefined,
    status: row.status,
    createdAt: row.created_at || row.createdAt,
  };
}

function newestFirst<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/* ------------------------------------------------------------------ *
 * Content
 * ------------------------------------------------------------------ */

export async function addContent(item: ContentItem): Promise<void> {
  const db = getSupabase();
  if (db) {
    try {
      const { error } = await db.from("content").upsert(fromContent(item));
      if (error) throw new Error(error.message);
      return;
    } catch (e) {
      console.error("Could not save content to Supabase, falling back:", e);
    }
  }

  if (isRedisConfigured()) {
    await kv.hset(CONTENT_KEY, { [item.id]: item });
    return;
  }

  memContent.push(item);
}

/**
 * Removes content permanently.
 *
 * Rows are tiny; the rendered PNGs are what actually fill the storage quota,
 * so callers are expected to pass the items' image URLs to `deleteImages`.
 * Returns how many were removed.
 */
export async function deleteContent(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const db = getSupabase();
  if (db) {
    try {
      const { error } = await db.from("content").delete().in("id", ids);
      if (error) throw new Error(error.message);
      return ids.length;
    } catch (e) {
      console.error("Could not delete content from Supabase, falling back:", e);
    }
  }

  if (isRedisConfigured()) {
    await kv.hdel(CONTENT_KEY, ...ids);
    return ids.length;
  }

  let removed = 0;
  for (const id of ids) {
    const at = memContent.findIndex((c) => c.id === id);
    if (at !== -1) {
      memContent.splice(at, 1);
      removed++;
    }
  }
  return removed;
}

export async function getContent(months = 2): Promise<ContentItem[]> {
  const db = getSupabase();
  if (db) {
    try {
      const since = new Date();
      since.setMonth(since.getMonth() - months);

      const { data, error } = await db
        .from("content")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) throw new Error(error.message);
      return (data || []).map(toContent);
    } catch (e) {
      console.error("Could not load content from Supabase, falling back:", e);
    }
  }

  if (isRedisConfigured()) {
    const all = await kv.hgetall<Record<string, ContentItem>>(CONTENT_KEY);
    if (!all) return [];
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    return newestFirst(
      Object.values(all)
        .map((r) => toContent(r))
        .filter((c) => new Date(c.createdAt) >= since)
    );
  }

  return newestFirst(memContent);
}

export async function getContentById(id: string): Promise<ContentItem | null> {
  const db = getSupabase();
  if (db) {
    try {
      const { data, error } = await db.from("content").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? toContent(data) : null;
    } catch (e) {
      console.error(`Could not load content ${id} from Supabase, falling back:`, e);
    }
  }

  if (isRedisConfigured()) {
    const item = await kv.hget<ContentItem>(CONTENT_KEY, id);
    return item ? toContent(item) : null;
  }

  return memContent.find((c) => c.id === id) || null;
}

export async function getContentByStatus(
  status: ContentItem["status"]
): Promise<ContentItem[]> {
  const db = getSupabase();
  if (db) {
    try {
      const { data, error } = await db
        .from("content")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map(toContent);
    } catch (e) {
      console.error("Could not load content by status from Supabase, falling back:", e);
    }
  }

  if (isRedisConfigured()) {
    const all = await getContent(6);
    return all.filter((c) => c.status === status);
  }

  return newestFirst(memContent).filter((c) => c.status === status);
}

export async function getContentByAgent(agentId: string): Promise<ContentItem[]> {
  const db = getSupabase();
  if (db) {
    try {
      const { data, error } = await db
        .from("content")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map(toContent);
    } catch (e) {
      console.error("Could not load content by agent from Supabase, falling back:", e);
    }
  }

  if (isRedisConfigured()) {
    const all = await getContent(6);
    return all.filter((c) => c.agentId === agentId);
  }

  return newestFirst(memContent).filter((c) => c.agentId === agentId);
}

export async function patchContent(
  id: string,
  patch: Partial<ContentItem>
): Promise<ContentItem | null> {
  const db = getSupabase();
  if (db) {
    try {
      const columns = patchColumns(patch);
      if (Object.keys(columns).length === 0) return getContentById(id);

      const { data, error } = await db
        .from("content")
        .update(columns)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data ? toContent(data) : null;
    } catch (e) {
      console.error(`Could not update content ${id} in Supabase, falling back:`, e);
    }
  }

  if (isRedisConfigured()) {
    const item = await getContentById(id);
    if (!item) return null;
    const updated = { ...item, ...patch };
    await kv.hset(CONTENT_KEY, { [id]: updated });
    return updated;
  }

  const item = memContent.find((c) => c.id === id);
  if (item) Object.assign(item, patch);
  return item || null;
}

export async function updateContentStatus(
  id: string,
  status: ContentItem["status"]
): Promise<ContentItem | null> {
  return patchContent(id, { status });
}

/* ------------------------------------------------------------------ *
 * Improvements
 * ------------------------------------------------------------------ */

export async function addImprovement(item: Improvement): Promise<void> {
  const db = getSupabase();
  if (db) {
    try {
      const { error } = await db.from("improvements").upsert({
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        priority: item.priority,
        files_to_change: item.filesToChange ?? null,
        code_changes: item.codeChanges ?? null,
        status: item.status,
        created_at: item.createdAt,
      });
      if (error) throw new Error(error.message);
      return;
    } catch (e) {
      console.error("Could not save improvement to Supabase, falling back:", e);
    }
  }

  if (isRedisConfigured()) {
    await kv.hset(IMPROVEMENTS_KEY, { [item.id]: item });
    return;
  }

  memImprovements.push(item);
}

export async function getImprovements(): Promise<Improvement[]> {
  const db = getSupabase();
  if (db) {
    try {
      const { data, error } = await db
        .from("improvements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw new Error(error.message);
      return (data || []).map(toImprovement);
    } catch (e) {
      console.error("Could not load improvements from Supabase, falling back:", e);
    }
  }

  if (isRedisConfigured()) {
    const all = await kv.hgetall<Record<string, Improvement>>(IMPROVEMENTS_KEY);
    if (!all) return [];
    return newestFirst(Object.values(all).map((r) => toImprovement(r)));
  }

  return newestFirst(memImprovements);
}

export async function updateImprovementStatus(
  id: string,
  status: Improvement["status"]
): Promise<Improvement | null> {
  const db = getSupabase();
  if (db) {
    try {
      const { data, error } = await db
        .from("improvements")
        .update({ status })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data ? toImprovement(data) : null;
    } catch (e) {
      console.error(`Could not update improvement ${id} in Supabase, falling back:`, e);
    }
  }

  if (isRedisConfigured()) {
    const all = await kv.hgetall<Record<string, Improvement>>(IMPROVEMENTS_KEY);
    if (!all || !all[id]) return null;
    const item = toImprovement(all[id]);
    item.status = status;
    await kv.hset(IMPROVEMENTS_KEY, { [id]: item });
    return item;
  }

  const item = memImprovements.find((i) => i.id === id);
  if (item) item.status = status;
  return item || null;
}

export function isStoreConfigured(): boolean {
  return isSupabaseConfigured() || isRedisConfigured();
}
