import { ContentItem, roles } from "./design-system";

/**
 * The gate that decides whether a generated piece is good enough to keep.
 *
 * Opening the theme, role and brief up to free text means the model is no
 * longer working inside a narrow template, and the failure modes that come
 * with that freedom are specific and detectable: production notes left in the
 * copy, placeholder text, a brief that was ignored, copy so short it says
 * nothing. Each is checked here so a weak piece is rejected with a reason
 * rather than sitting in the queue looking finished.
 */

export interface QualityProblem {
  /** Short machine-readable reason, also shown to the operator. */
  code: string;
  detail: string;
  /**
   * False for a problem that should inform a retry but never fail the piece
   * outright. Reserved for checks that are inherently a guess rather than a
   * fact about the text, like whether a brief was honoured. Omitted or true
   * means the piece is rejected while this problem is present.
   */
  blocking?: boolean;
}

export interface QualityVerdict {
  ok: boolean;
  problems: QualityProblem[];
}

/** Production scaffolding that should never survive into finished copy. */
const SCAFFOLDING = [
  /\bbackground description\b/i,
  /\btext overlay\b/i,
  /\bsticker (?:type|content)\b/i,
  /\bimage description\b/i,
  /\bvisual element\b/i,
  /\btransition cues?\b/i,
  /\bmusic mood\b/i,
  /\b(?:frame|slide|scene)\s*\d+\s*:/i,
  /^#{1,6}\s+/m,
  /\*\*/,
];

const PLACEHOLDERS = [
  /\blorem ipsum\b/i,
  /\bTODO\b/,
  /\[insert[^\]]*\]/i,
  /\{\{[^}]*\}\}/,
  /\byour (?:brand|product|game) here\b/i,
  /\bxxx+\b/i,
];

/** Everything a reader would actually see for this piece. */
function visibleCopy(item: ContentItem): string {
  return [item.caption, item.reelScript, ...(item.slides || []), ...(item.storyFrames || [])]
    .filter(Boolean)
    .join("\n");
}

/**
 * Pulls concrete demands out of the operator's brief.
 *
 * A countdown is the case that matters most: asking for "9 days to go" and
 * getting generic hype is the single most common way a piece silently misses
 * what was asked for, and it is cheap to check.
 */
function requiredPhrases(steer?: string): string[] {
  if (!steer) return [];
  const needed: string[] = [];

  const countdown = steer.match(/\b(\d{1,3})\s*(?:days?|hours?|weeks?)\b/i);
  if (countdown) needed.push(countdown[1]);

  return needed;
}

export interface AssessOptions {
  steer?: string;
  /**
   * True when the operator explicitly asked for no character. Distinct from
   * simply not naming one: a countdown asked to be about the game itself
   * still came back centred on a specific role, because the base context
   * every prompt got listed the roster regardless of whether one was wanted.
   * Checkable and precise, unlike the digit-matching brief check below, so
   * this one is allowed to block.
   */
  forbidRoleNames?: boolean;
  /**
   * The role the piece was actually built around, whether the operator named
   * it or the template auto-picked one. Every prompt that features a role
   * says so explicitly, so a piece that never mentions it anywhere a reader
   * would see is a fact about the text, not a guess - the model swapped
   * subjects mid-generation.
   */
  expectedRole?: string;
  /**
   * Slides or frames the prompt asked for. The contract states an exact
   * count, so coming back short is a checkable shortfall, not a style choice
   * - a carousel two slides shorter than requested is a carousel that will
   * not say what it was meant to.
   */
  expectedCount?: number;
}

/** Matches a role's display name as a whole phrase, case-insensitively. */
function nameMention(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

/** Every field a reader could plausibly see a role or tag named in. */
function allText(item: ContentItem): string {
  return [visibleCopy(item), item.title, ...(item.hashtags || [])].join("\n");
}

export function assessContent(
  item: ContentItem,
  opts: AssessOptions = {}
): QualityVerdict {
  const { steer, forbidRoleNames, expectedRole, expectedCount } = opts;
  const problems: QualityProblem[] = [];
  const copy = visibleCopy(item);
  const trimmed = copy.trim();

  if (trimmed.length < 40) {
    problems.push({
      code: "too-short",
      detail: `only ${trimmed.length} characters of copy, which is not a post`,
    });
  }

  for (const pattern of SCAFFOLDING) {
    if (pattern.test(copy)) {
      problems.push({
        code: "scaffolding",
        detail: `production notes left in the copy (${pattern.source})`,
      });
      break;
    }
  }

  for (const pattern of PLACEHOLDERS) {
    if (pattern.test(copy)) {
      problems.push({ code: "placeholder", detail: "placeholder text was never filled in" });
      break;
    }
  }

  if (/[\u2014\u2013]/.test(copy)) {
    problems.push({ code: "em-dash", detail: "em dashes are not the brand voice" });
  }

  if (/(^|\s)#\w+/.test(copy)) {
    problems.push({
      code: "inline-hashtags",
      detail: "hashtags are written into the copy instead of the hashtag field",
    });
  }

  // The title is a label, not copy. If they match, nothing was really written.
  if (trimmed.toLowerCase() === item.title.trim().toLowerCase()) {
    problems.push({ code: "title-echo", detail: "the copy is just the title repeated" });
  }

  // Substring matching a digit against free text is a guess, not a fact: the
  // model may have written "one week" for "7 days", or the "7" in the brief
  // may not have meant a countdown at all. Wrong here should never be the
  // reason a piece gets thrown away, so this only ever feeds the retry.
  const missing = requiredPhrases(steer).filter((phrase) => !copy.includes(phrase));
  if (missing.length) {
    problems.push({
      code: "brief-ignored",
      detail: `the brief mentioned ${missing.join(", ")} and the copy may not say it`,
      blocking: false,
    });
  }

  if (item.hashtags.length && item.hashtags[0] !== "#strategy" && item.hashtags.length < 4) {
    problems.push({
      code: "thin-hashtags",
      detail: `only ${item.hashtags.length} usable hashtags`,
    });
  }

  if (item.type === "carousel" && (item.slides?.length || 0) < 2) {
    problems.push({ code: "thin-carousel", detail: "a carousel needs at least two slides" });
  }

  if (item.type === "story" && (item.storyFrames?.length || 0) < 1) {
    problems.push({ code: "no-frames", detail: "the story has no frames" });
  }

  if (forbidRoleNames) {
    // Scans hashtags too now: "#Morgana" is exactly as much a role mention as
    // the name in the caption, and the first version of this check only ever
    // looked at copy and title.
    const scan = allText(item);
    const named = roles.find((r) => nameMention(r.name).test(scan));
    if (named) {
      problems.push({
        code: "unwanted-role",
        detail: `no role was requested but the piece centres on ${named.name}`,
      });
    }
  }

  // The counterpart to forbidRoleNames: a role was requested, whether by name
  // or by the template's own pick, and the prompt said so explicitly, so a
  // piece that never mentions it anywhere a reader would see swapped subjects
  // rather than merely phrasing it differently - a fact about the text, not a
  // guess about intent.
  if (expectedRole && !nameMention(expectedRole).test(allText(item))) {
    problems.push({
      code: "role-dropped",
      detail: `the piece was built around ${expectedRole} but never mentions them anywhere`,
    });
  }

  if (expectedCount) {
    const actual =
      item.type === "carousel" ? item.slides?.length || 0
      : item.type === "story" ? item.storyFrames?.length || 0
      : undefined;
    if (actual !== undefined && actual < expectedCount) {
      problems.push({
        code: "count-short",
        detail: `asked for ${expectedCount} ${item.type === "carousel" ? "slides" : "frames"}, got ${actual}`,
      });
    }
  }

  // Ties the script to the video it is actually going to become. The prompt
  // asks for roughly durationSec * 2 * 0.85 words (see outputContract in
  // ai.ts, kept in sync with this), so a script far outside that is not a
  // style choice, it is a script that will not fit the reel's declared
  // length: too few words leaves dead air, too many rushes the beats past
  // reading speed once video.ts divides the runtime between them evenly.
  if (item.type === "reel" && item.reelScript && item.durationSec) {
    const words = item.reelScript.trim().split(/\s+/).filter(Boolean).length;
    const target = item.durationSec * 2 * 0.85;
    if (words < target * 0.35 || words > target * 2.5) {
      problems.push({
        code: "reel-pacing",
        detail: `script is ${words} words for a ${item.durationSec}s reel, target is about ${Math.round(target)}`,
      });
    }
  }

  return { ok: problems.every((p) => p.blocking === false), problems };
}

/** One line summarising why a piece was turned away. */
export function describeProblems(problems: QualityProblem[]): string {
  return problems.map((p) => p.detail).join("; ");
}
