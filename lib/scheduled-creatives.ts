import fs from "fs";
import path from "path";
import { ContentItem } from "./design-system";
import { putImage, putVideo, isSupabaseConfigured } from "./supabase";
import {
  publishToInstagram,
  publishStoryToInstagram,
  publishReelToInstagram,
  isInstagramConfigured,
  PublishResult,
} from "./instagram";
import { getAgentStates, isAgentEnabled, recordAgentRun, setAgentEnabled, isSettingsPersisted } from "./agent-settings";

/**
 * A pre-made week of creatives (see creatives/_tools/schedule_week.cjs) posted
 * on a fixed timetable: 3pm post, 6pm reel, 8pm story, IST.
 *
 * The finished media and captions live in scheduled/ and ship with the deploy.
 * Each slot has its own Vercel cron that calls /api/cron/creatives; the route
 * publishes whatever is due for that slot. Per-item results reuse the
 * agent_state store under a "scheduled:<id>" key, so a cold serverless start
 * never posts the same item twice.
 */

export type Slot = "post" | "reel" | "story";

export interface ScheduledItem {
  id: string;
  date: string;
  slot: Slot;
  type: Slot;
  time: string; // IST, HH:MM
  scheduledFor: string; // ISO, UTC
  title: string;
  file: string; // relative to scheduled/
  caption: string;
  hashtags: string[];
}

export type ItemStatus = "published" | "failed" | "due" | "missed" | "upcoming";

export interface ScheduledView extends ScheduledItem {
  status: ItemStatus;
  publishedAt?: string;
  error?: string;
}

/** A cron can fire late (Vercel Hobby drifts up to an hour); past this a slot counts as missed rather than being posted at a random hour. */
export const GRACE_MS = 3 * 60 * 60 * 1000;

const PAUSE_ID = "scheduled-creatives";
const stateId = (id: string) => `scheduled:${id}`;
const DIR = path.join(process.cwd(), "scheduled");

export function loadSchedule(): ScheduledItem[] {
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, "manifest.json"), "utf8"));
  return raw.items as ScheduledItem[];
}

export async function isSchedulePaused(): Promise<boolean> {
  return !(await isAgentEnabled(PAUSE_ID));
}

export async function setSchedulePaused(paused: boolean): Promise<void> {
  await setAgentEnabled(PAUSE_ID, !paused);
}

function classify(
  item: ScheduledItem,
  state: { lastRun?: string; lastCount?: number; lastError?: string } | undefined,
  now: number
): ScheduledView {
  if (state?.lastRun && state.lastCount === 1 && !state.lastError) {
    return { ...item, status: "published", publishedAt: state.lastRun };
  }
  const at = new Date(item.scheduledFor).getTime();
  const err = state?.lastError ? { error: state.lastError } : {};
  if (at > now) return { ...item, status: "upcoming", ...err };
  if (now - at <= GRACE_MS) return { ...item, status: state?.lastError ? "failed" : "due", ...err };
  return { ...item, status: state?.lastError ? "failed" : "missed", ...err };
}

export async function getScheduleView(): Promise<ScheduledView[]> {
  const states = await getAgentStates();
  const now = Date.now();
  return loadSchedule().map((i) => classify(i, states[stateId(i.id)], now));
}

function toContent(item: ScheduledItem): ContentItem {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    caption: item.caption,
    hashtags: item.hashtags,
    status: "approved",
    createdAt: item.scheduledFor,
    theme: "scheduled-creatives",
  };
}

/** Uploads the item's media to Supabase storage (Instagram fetches by public URL), publishes it, and records the result. */
export async function publishScheduledItem(item: ScheduledItem): Promise<PublishResult> {
  if (!isInstagramConfigured()) {
    return { success: false, platform: "instagram", error: "Instagram credentials not configured." };
  }
  if (!isSupabaseConfigured()) {
    return { success: false, platform: "instagram", error: "Supabase is not configured, so the media cannot be hosted for Instagram." };
  }

  let result: PublishResult;
  try {
    const bytes = fs.readFileSync(path.join(DIR, item.file));
    const dest = `scheduled/${item.file}`;
    const content = toContent(item);
    const imageType = item.file.endsWith(".jpg") ? "image/jpeg" : "image/png";

    if (item.type === "reel") {
      result = await publishReelToInstagram(content, await putVideo(dest, bytes));
    } else if (item.type === "story") {
      result = await publishStoryToInstagram(content, [await putImage(dest, bytes, imageType)]);
    } else {
      result = await publishToInstagram(content, await putImage(dest, bytes, imageType));
    }
  } catch (e: any) {
    result = { success: false, platform: "instagram", error: e?.message || String(e) };
  }

  await recordAgentRun(stateId(item.id), result.success ? 1 : 0, result.success ? undefined : result.error || "unknown error");
  return result;
}

export interface CronOutcome {
  paused: boolean;
  slot: string | null;
  due: number;
  published: string[];
  failed: { id: string; error: string }[];
  error?: string;
}

/** What a cron call does: publish this slot's due, not-yet-posted items. A failed item is retried by a later call while still inside the grace window. */
export async function publishDueScheduled(slot: Slot | null): Promise<CronOutcome> {
  const out: CronOutcome = { paused: false, slot, due: 0, published: [], failed: [] };

  if (await isSchedulePaused()) return { ...out, paused: true };
  if (!isSettingsPersisted()) {
    // Without Supabase or Redis the "already posted" record is per-instance memory, so a cold start would post twice.
    return { ...out, error: "No persistent store configured (Supabase or Redis); refusing to auto-post to avoid duplicates." };
  }

  const due = (await getScheduleView()).filter(
    (i) => (i.status === "due" || i.status === "failed") && (slot ? i.slot === slot : true) && Date.now() - new Date(i.scheduledFor).getTime() <= GRACE_MS
  );
  out.due = due.length;

  for (const item of due) {
    const r = await publishScheduledItem(item);
    if (r.success) out.published.push(item.id);
    else out.failed.push({ id: item.id, error: r.error || "unknown error" });
  }
  return out;
}

export function mediaPath(item: ScheduledItem): string {
  return path.join(DIR, item.file);
}
