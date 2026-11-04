import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase is the database and the image host.
 *
 * Everything here runs server-side only and uses the service-role key, which
 * bypasses row-level security. That key must never reach the browser - it is
 * read from a non-NEXT_PUBLIC env var so a stray import into a client component
 * fails loudly rather than leaking it.
 */

const DEFAULT_BUCKET = "media";

/**
 * The storage bucket name, which is a bare name like "media".
 *
 * Supabase's storage settings page shows an S3 endpoint URL beside the bucket
 * list, and pasting that into SUPABASE_BUCKET names a bucket that cannot
 * exist, so every upload fails with "Bucket not found". Anything containing a
 * slash or a scheme is not a bucket name, so it is rejected in favour of the
 * default rather than being sent to the API.
 */
function resolveBucket(): string {
  const raw = (process.env.SUPABASE_BUCKET || "").trim();
  if (!raw) return DEFAULT_BUCKET;

  if (raw.includes("://") || raw.includes("/")) {
    console.error(
      `SUPABASE_BUCKET is set to "${raw}", which is a URL rather than a bucket name. ` +
        `Falling back to "${DEFAULT_BUCKET}". Set it to the bucket's name, or remove it entirely.`
    );
    return DEFAULT_BUCKET;
  }
  return raw;
}

export const MEDIA_BUCKET = resolveBucket();

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Uploads an image and returns its public URL.
 *
 * The bucket must be public: Instagram fetches images by URL and will not
 * present credentials. `upsert` is on so re-rendering an item overwrites its
 * artwork rather than accumulating orphans.
 */
export async function putImage(path: string, bytes: Buffer, contentType = "image/png"): Promise<string> {
  const db = getSupabase();
  if (!db) throw new Error("Supabase is not configured");

  const { error } = await db.storage.from(MEDIA_BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });

  if (error) {
    // "Bucket not found" on its own gives no way to tell a missing bucket from
    // a name that does not match SUPABASE_BUCKET, so name both sides.
    if (/bucket not found/i.test(error.message)) {
      let available = "could not be listed";
      try {
        const { data } = await db.storage.listBuckets();
        available = data?.length ? data.map((b) => `"${b.name}"`).join(", ") : "none";
      } catch {
        /* keep the placeholder */
      }
      throw new Error(
        `Storage bucket "${MEDIA_BUCKET}" was not found in this Supabase project. ` +
          `Buckets that do exist: ${available}. ` +
          `Either create "${MEDIA_BUCKET}" as a public bucket, or set SUPABASE_BUCKET to the right name.`
      );
    }
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const { data } = db.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not resolve a public URL for the upload");
  return data.publicUrl;
}

/**
 * Uploads a rendered reel and returns its public URL.
 *
 * Same bucket and same public requirement as the artwork: Instagram fetches
 * the video by URL with no credentials.
 */
export async function putVideo(path: string, bytes: Buffer): Promise<string> {
  const db = getSupabase();
  if (!db) throw new Error("Supabase is not configured");

  const { error } = await db.storage.from(MEDIA_BUCKET).upload(path, bytes, {
    contentType: "video/mp4",
    upsert: true,
  });
  if (error) throw new Error(`Video upload failed: ${error.message}`);

  const { data } = db.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not resolve a public URL for the video");
  return data.publicUrl;
}

export async function deleteImages(paths: string[]): Promise<void> {
  const db = getSupabase();
  if (!db || paths.length === 0) return;
  await db.storage.from(MEDIA_BUCKET).remove(paths);
}

/**
 * Recovers the storage path from a public URL.
 *
 * Content stores the public URLs it was given, but removing an object needs
 * the path inside the bucket, which is everything after
 * /object/public/<bucket>/.
 */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${MEDIA_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const path = url.slice(at + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

/** Frees the artwork belonging to the given items. Never throws. */
export async function deleteImagesByUrl(urls: string[]): Promise<number> {
  const paths = urls
    .map(storagePathFromUrl)
    .filter((p): p is string => !!p);
  if (paths.length === 0) return 0;

  try {
    await deleteImages(paths);
    return paths.length;
  } catch (e) {
    // Losing the artwork is not a reason to fail the delete of the row.
    console.error("Could not remove stored artwork:", e);
    return 0;
  }
}
