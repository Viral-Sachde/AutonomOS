import { putImage } from "./supabase";

/**
 * Where rendered artwork goes.
 *
 * Kept as its own module so the image composer does not need to know which
 * storage backend is in use - it just asks for a public URL back.
 */
export async function putBinary(
  path: string,
  bytes: Buffer,
  /** Human-readable note. Retained for call-site clarity; storage ignores it. */
  _label?: string
): Promise<string> {
  return putImage(path, bytes);
}

export { isSupabaseConfigured as isMediaStoreConfigured } from "./supabase";
