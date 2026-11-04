import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getSupabase, isSupabaseConfigured, MEDIA_BUCKET } from "@/lib/supabase";
import { isInstagramConfigured } from "@/lib/instagram";
import { renderPng } from "@/lib/render";
import ffmpegPath from "ffmpeg-static";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One place to answer "why did publishing fail".
 *
 * Publishing depends on four things that live outside the code: the fonts
 * being in the serverless bundle, the storage bucket existing and being
 * public, a working Instagram token, and the database tables. Each failed in a
 * way that surfaced as the same unhelpful media error, so each is checked here
 * and reported on its own. No secret values are returned, only whether they
 * are present and working.
 */

interface Check {
  name: string;
  ok: boolean;
  detail: string;
  fix?: string;
}

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const FONT_FILES = [
  "InstrumentSerif-Regular.ttf",
  "InstrumentSerif-Italic.ttf",
  "Lora.ttf",
  "Lora-Italic.ttf",
  "Cinzel.ttf",
];

function checkFonts(): Check {
  const missing = FONT_FILES.filter((f) => !fs.existsSync(path.join(FONT_DIR, f)));
  return {
    name: "brand fonts on disk",
    ok: missing.length === 0,
    detail: missing.length
      ? `missing ${missing.length} of ${FONT_FILES.length} under ${FONT_DIR}: ${missing.join(", ")}`
      : `all ${FONT_FILES.length} present`,
    fix: missing.length
      ? "The serverless bundle is not shipping assets/fonts. Confirm outputFileTracingIncludes in next.config.js covers this route, then redeploy."
      : undefined,
  };
}

function checkRender(): Check {
  try {
    const png = renderPng(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40">' +
        '<rect width="80" height="40" fill="#141a3e"/>' +
        '<text x="6" y="26" font-family="Lora" font-size="16" fill="#f4e8c8">ok</text></svg>'
    );
    return {
      name: "image renderer",
      ok: png.length > 0,
      detail: `rendered a ${png.length} byte test png`,
    };
  } catch (e: any) {
    return {
      name: "image renderer",
      ok: false,
      detail: e?.message || String(e),
      fix: "resvg could not run. Check that @resvg/resvg-js is in serverExternalPackages and that the fonts check above passes.",
    };
  }
}

/**
 * Same failure shape as checkFonts: lib/video.ts spawns ffmpeg by path
 * instead of requiring it, so tracing can silently drop it from the
 * serverless bundle. Unlike a missing font, this never blocks generation or
 * approval, only publishing a reel, so it surfaces as "Could not start
 * ffmpeg: spawn .../ffmpeg ENOENT" well after the piece looked done.
 */
function checkFfmpeg(): Check {
  const bin = ffmpegPath as unknown as string | null;
  const exists = !!bin && fs.existsSync(bin);
  return {
    name: "reel video encoder",
    ok: exists,
    detail: bin
      ? exists
        ? `ffmpeg binary present at ${bin}`
        : `ffmpeg-static resolved a path but nothing exists there: ${bin}`
      : "ffmpeg-static did not resolve a binary path for this platform",
    fix: exists
      ? undefined
      : "The serverless bundle is not shipping node_modules/ffmpeg-static/ffmpeg. Confirm outputFileTracingIncludes for /api/publish covers it in next.config.js, then redeploy.",
  };
}

/**
 * Informational, never blocking: a reel publishes fine with no music (it
 * falls back to the silent track Instagram requires at a minimum), so this
 * exists only so "did my tracks actually ship" can be checked without
 * publishing a reel to find out.
 */
function checkMusic(): Check {
  const dir = path.join(process.cwd(), "assets", "audio");
  const exts = new Set([".mp3", ".m4a", ".wav", ".ogg"]);
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => exts.has(path.extname(f).toLowerCase()));
  } catch {
    // Directory missing entirely is the same as empty - both just mean no
    // tracks were added yet.
  }
  return {
    name: "reel background music",
    ok: true,
    detail:
      files.length > 0
        ? `${files.length} track${files.length === 1 ? "" : "s"} in assets/audio, reels will use one`
        : "no tracks in assets/audio yet, reels publish with a silent track",
    fix: files.length > 0 ? undefined : "Drop royalty-free instrumental tracks into assets/audio (see its README.md). No code change or redeploy needed beyond that.",
  };
}

/**
 * A write to content fails as a whole if any column is missing, and the store
 * then falls back to Redis and finally to per-instance memory. That fallback
 * is why a freshly generated item can appear, vanish, and reappear between
 * refreshes: each serverless instance holds its own copy.
 */
async function checkDatabase(): Promise<Check> {
  const db = getSupabase();
  if (!db) {
    return { name: "content table", ok: false, detail: "supabase not configured" };
  }

  try {
    // Every column store.ts writes on insert. Missing any one of them fails
    // the whole insert, not just that field, so each new column added here
    // has to be added to this check too or diagnostics stops catching it.
    const { error } = await db
      .from("content")
      .select("id,duration_sec,accent_color,generation_mode")
      .limit(1);
    if (error) {
      const missing = error.message.match(/column "?(\w+)"? does not exist/i)?.[1];
      return {
        name: "content table",
        ok: false,
        detail: error.message,
        fix: missing
          ? `Run: alter table public.content add column if not exists ${missing} ${missing === "duration_sec" ? "integer" : "text"}; ` +
            "Until then every content insert fails and falls back to memory, so new items appear to generate but vanish on the next load."
          : "Run supabase/schema.sql in the Supabase SQL editor.",
      };
    }
    return { name: "content table", ok: true, detail: "reachable with every expected column" };
  } catch (e: any) {
    return { name: "content table", ok: false, detail: e?.message || String(e) };
  }
}

async function checkStorage(): Promise<Check> {
  if (!isSupabaseConfigured()) {
    return {
      name: "supabase storage",
      ok: false,
      detail: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set",
      fix: "Add both in Vercel, then redeploy. Without them nothing can be uploaded and publishing has no image to give Instagram.",
    };
  }

  const db = getSupabase();
  if (!db) {
    return { name: "supabase storage", ok: false, detail: "client could not be created" };
  }

  try {
    const { data, error } = await db.storage.getBucket(MEDIA_BUCKET);
    if (error || !data) {
      return {
        name: "supabase storage",
        ok: false,
        detail: `bucket "${MEDIA_BUCKET}" not reachable: ${error?.message || "not found"}`,
        fix: "Run supabase/schema.sql in the Supabase SQL editor. It creates the bucket and marks it public.",
      };
    }
    return {
      name: "supabase storage",
      ok: data.public === true,
      detail: `bucket "${MEDIA_BUCKET}" exists, public=${data.public}`,
      fix: data.public
        ? undefined
        : "Instagram fetches images anonymously. Make the bucket public in Storage settings, or re-run supabase/schema.sql.",
    };
  } catch (e: any) {
    return { name: "supabase storage", ok: false, detail: e?.message || String(e) };
  }
}

async function checkUploadRoundTrip(): Promise<Check> {
  const db = getSupabase();
  if (!db) return { name: "upload round trip", ok: false, detail: "supabase not configured" };

  const key = `diagnostics/health-check.png`;
  try {
    const png = renderPng(
      '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#c89858"/></svg>'
    );
    const { error } = await db.storage.from(MEDIA_BUCKET).upload(key, png, {
      contentType: "image/png",
      upsert: true,
    });
    if (error) {
      return {
        name: "upload round trip",
        ok: false,
        detail: `upload failed: ${error.message}`,
        fix: "The service role key may lack storage access, or the bucket does not exist.",
      };
    }

    const { data } = db.storage.from(MEDIA_BUCKET).getPublicUrl(key);
    const url = data?.publicUrl;
    if (!url) return { name: "upload round trip", ok: false, detail: "no public URL returned" };

    const res = await fetch(url, { headers: { Range: "bytes=0-0" } });
    return {
      name: "upload round trip",
      ok: res.ok || res.status === 206,
      detail: `uploaded and fetched anonymously: HTTP ${res.status}`,
      fix:
        res.ok || res.status === 206
          ? undefined
          : "The uploaded file is not readable without credentials, so Instagram cannot fetch it. Make the bucket public.",
    };
  } catch (e: any) {
    return { name: "upload round trip", ok: false, detail: e?.message || String(e) };
  }
}

async function checkInstagram(): Promise<Check> {
  if (!isInstagramConfigured()) {
    return {
      name: "instagram credentials",
      ok: false,
      detail: "INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID is not set",
      fix: "Publishing stays review only until both are set. See INSTAGRAM-SETUP.md.",
    };
  }

  const token = (process.env.INSTAGRAM_ACCESS_TOKEN || "").trim();
  const accountId = (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || "").trim();

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${accountId}?fields=username&access_token=${encodeURIComponent(token)}`
    );
    const data = await res.json();
    if (data.error) {
      return {
        name: "instagram credentials",
        ok: false,
        detail: data.error.message,
        fix: "Regenerate a long lived token with instagram_content_publish, and confirm the account id is the Instagram Business account id rather than the Facebook page id.",
      };
    }
    return {
      name: "instagram credentials",
      ok: true,
      detail: `authenticated as @${data.username}`,
    };
  } catch (e: any) {
    return { name: "instagram credentials", ok: false, detail: e?.message || String(e) };
  }
}

function checkAi(): Check {
  const provider = process.env.AI_PROVIDER || (process.env.ANTHROPIC_API_KEY ? "claude" : "none");
  const ok = provider !== "none";
  return {
    name: "ai provider",
    ok,
    detail: ok ? `using ${provider}` : "no provider set, agents fall back to templates",
    fix: ok ? undefined : "Set ANTHROPIC_API_KEY and AI_PROVIDER=claude to generate real copy.",
  };
}

export async function GET() {
  const checks: Check[] = [checkFonts(), checkRender(), checkFfmpeg(), checkMusic(), checkAi()];

  if (isSupabaseConfigured()) checks.push(await checkDatabase());
  checks.push(await checkStorage());
  if (isSupabaseConfigured()) checks.push(await checkUploadRoundTrip());
  checks.push(await checkInstagram());

  const blocking = checks.filter((c) => !c.ok);

  return NextResponse.json({
    ready: blocking.length === 0,
    summary: blocking.length
      ? `${blocking.length} of ${checks.length} checks failing: ${blocking.map((c) => c.name).join(", ")}`
      : `all ${checks.length} checks passing, publishing should work`,
    checks,
  });
}
