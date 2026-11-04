import { ContentItem } from "./design-system";

/**
 * Near-duplicate detection for generated content.
 *
 * The anti-repetition hints in the prompt are a request, not a guarantee - a
 * model asked for "something fresh" will still circle back to the same three
 * hooks within a week. This checks the actual output against what has already
 * been stored and rejects anything too close, so the feed does not fill up with
 * the same post reworded.
 */

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "to", "of", "in", "on", "at", "for", "with", "by", "from", "as", "it", "its",
  "this", "that", "these", "those", "you", "your", "they", "them", "their",
  "who", "what", "when", "where", "how", "why", "just", "so", "one", "night",
]);

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/#\w+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Character trigrams catch rewording that a word-level check would miss. */
function trigrams(text: string): Set<string> {
  const s = normalize(text).replace(/\s/g, "");
  const out = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
  return out;
}

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const v of a) if (b.has(v)) shared++;
  return shared / (a.size + b.size - shared);
}

/**
 * 0 = unrelated, 1 = identical. Blends word overlap with character trigrams so
 * both "same idea, different words" and "same words, reordered" score high.
 */
export function similarity(a: string, b: string): number {
  const wordScore = jaccard(new Set(tokens(a)), new Set(tokens(b)));
  const charScore = jaccard(trigrams(a), trigrams(b));
  return wordScore * 0.5 + charScore * 0.5;
}

/** Text that identifies a piece of content for comparison purposes. */
export function signature(item: Pick<ContentItem, "caption" | "title" | "reelScript" | "slides">): string {
  return [
    item.title,
    item.caption,
    item.reelScript || "",
    (item.slides || []).join(" "),
  ]
    .join(" ")
    .slice(0, 2000);
}

/** Above this, two pieces are considered the same idea. */
export const DUPLICATE_THRESHOLD = 0.55;

export interface DuplicateVerdict {
  isDuplicate: boolean;
  score: number;
  matchedId?: string;
  matchedTitle?: string;
}

/**
 * Compares one item against previously stored content. Only the same content
 * type is considered - a reel and a post covering one theme is intentional
 * cross-format coverage, not repetition.
 */
export function checkDuplicate(
  candidate: ContentItem,
  existing: ContentItem[],
  threshold = DUPLICATE_THRESHOLD
): DuplicateVerdict {
  const candidateSig = signature(candidate);
  let worst: DuplicateVerdict = { isDuplicate: false, score: 0 };

  for (const item of existing) {
    if (item.id === candidate.id) continue;
    if (item.type !== candidate.type) continue;

    const score = similarity(candidateSig, signature(item));
    if (score > worst.score) {
      worst = {
        isDuplicate: score >= threshold,
        score,
        matchedId: item.id,
        matchedTitle: item.title,
      };
    }
  }

  return worst;
}

/**
 * Runs `produce` until it yields something that is not a near-duplicate.
 *
 * After the last attempt the best candidate is returned anyway, flagged rather
 * than discarded: a slightly repetitive post in the review queue is more useful
 * than an empty cron run, and the operator can still reject it.
 */
export async function generateUnique(
  produce: () => Promise<ContentItem>,
  existing: ContentItem[],
  attempts = 3
): Promise<{ item: ContentItem; verdict: DuplicateVerdict; attemptsUsed: number }> {
  let best: { item: ContentItem; verdict: DuplicateVerdict } | null = null;

  for (let i = 1; i <= attempts; i++) {
    const item = await produce();
    const verdict = checkDuplicate(item, existing);

    if (!verdict.isDuplicate) {
      return { item, verdict, attemptsUsed: i };
    }
    if (!best || verdict.score < best.verdict.score) {
      best = { item, verdict };
    }
  }

  return { item: best!.item, verdict: best!.verdict, attemptsUsed: attempts };
}
