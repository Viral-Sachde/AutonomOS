/**
 * Turns a model response into copy that is safe to print on a card.
 *
 * The agents used to hand the raw response straight to the renderer, so
 * whatever scaffolding the model wrapped around its answer - markdown headings,
 * "**Background Description:**" art direction, sticker notes, outline numbering
 * - got typeset as if it were the content. Every agent now asks for JSON and
 * runs the result through here, and the prose fallbacks below cover the case
 * where a model answers with a document anyway.
 */

/**
 * Labels whose whole line is production detail. The line goes.
 */
const DROP_LABEL =
  /^\s*\**\s*(background(?:\s+description)?|visuals?(?:\s+element)?(?:\s+description)?|image(?:\s+description)?|art\s+direction|sticker(?:\s+type|\s+content)?|transition|music|mood|sound|sfx|design(?:\s+system)?(?:\s+reference)?|layout|accent|palette|colou?rs?|fonts?|duration|timing|format|notes?|reference|swipe\s+indicator|hashtags?)\s*\**\s*[:\-]/i;

/**
 * Labels that introduce real copy. The label goes, the value stays.
 *
 * Dropping these outright was its own bug: "Text Overlay: \"which role are you
 * tonight?\"" is the only actual sentence on the frame.
 */
const VALUE_LABEL =
  /^\s*\**\s*(text\s+overlay|overlay\s+text|on[- ]screen\s+text|text|headline|title|subtext|copy|line|caption|hook|cta|call\s+to\s+action)\s*\**\s*[:\-]\s*\**\s*/i;

/** Structural markers that are never copy. */
const STRUCTURE_LINE =
  /^\s*\**\s*(frame|slide|screen|chapter|panel|part|step|scene|section)\s*\d*\s*\**\s*[:.\-]?\s*$/i;

/** Strips one layer of wrapping quotes left behind by a label value. */
function unquote(input: string): string {
  const trimmed = input.trim();
  // [\s\S] rather than . with the s flag, which needs an ES2018 target.
  const m = trimmed.match(/^["“'‘]([\s\S]*)["”'’]$/);
  return m ? m[1].trim() : trimmed;
}

/**
 * Removes markdown furniture. The renderer draws plain glyphs, so a stray "#"
 * or "**" is printed literally rather than interpreted.
 */
export function stripMarkdown(input: string): string {
  return input
    .replace(/```[a-z]*\n?/gi, "")
    // The space is required: without it "#GameDev" loses its hash and survives
    // as a stray word.
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|$|[.,!?])/g, "$1$2")
    .replace(/(^|\s)_(\S[^_]*?)_(?=\s|$|[.,!?])/g, "$1$2")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}

/**
 * Removes hashtags from copy that gets typeset.
 *
 * Tags live in an item's `hashtags` field and are appended when the caption is
 * built for Instagram, so a tag written inline is both wrong on the artwork and
 * a duplicate in the caption.
 */
export function stripHashtags(input: string): string {
  return input
    // \w rather than unicode property escapes, which need an ES2018 target.
    .replace(/(^|\s)#\w+/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "");
}

/** The brand voice does not use em dashes. */
export function stripEmDashes(input: string): string {
  return input
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/([,;:])\s*,/g, "$1");
}

/**
 * Full clean-up for a single piece of copy: drops scaffolding lines, markdown
 * and em dashes, then collapses the whitespace that removal leaves behind.
 */
export function cleanCopy(input: string): string {
  if (!input) return "";

  const kept: string[] = [];

  // Filtering runs on the raw text, before markdown is stripped, so a heading
  // is still recognisable as document structure rather than a stray word.
  // "#{1,6} " requires the space, which keeps #Hashtags intact.
  for (const raw of input.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").split("\n")) {
    if (/^\s*#{1,6}\s+/.test(raw)) continue;
    if (/^\s*[-*_]{3,}\s*$/.test(raw)) continue;
    if (STRUCTURE_LINE.test(raw)) continue;
    if (DROP_LABEL.test(raw)) continue;

    const valued = raw.match(VALUE_LABEL);
    kept.push(valued ? unquote(raw.slice(valued[0].length)) : raw);
  }

  return stripHashtags(stripEmDashes(stripMarkdown(kept.join("\n"))))
    .replace(/^\s*[:\-•]\s*/gm, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Pulls the first JSON value out of a response.
 *
 * Models routinely wrap JSON in a fenced block or a sentence of preamble, so
 * this scans for a balanced object or array rather than trusting the whole
 * string to parse.
 */
export function extractJson<T = any>(text: string): T | null {
  if (!text) return null;

  const withoutFence = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");

  for (const open of ["{", "["] as const) {
    const close = open === "{" ? "}" : "]";
    let start = withoutFence.indexOf(open);

    while (start !== -1) {
      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let i = start; i < withoutFence.length; i++) {
        const ch = withoutFence[i];

        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (inString) continue;

        if (ch === open) depth++;
        else if (ch === close) {
          depth--;
          if (depth === 0) {
            try {
              return JSON.parse(withoutFence.slice(start, i + 1)) as T;
            } catch {
              break;
            }
          }
        }
      }
      start = withoutFence.indexOf(open, start + 1);
    }
  }
  return null;
}

/**
 * Splits a prose response into frames or slides.
 *
 * Used when a model ignores the JSON contract. The entire marker line is
 * consumed, not just the "FRAME 2:" prefix, because what follows it on that
 * line is the model's outline label ("Hook/Question", "Role Spotlight with
 * Dramatic Reveal") rather than copy anyone should read.
 */
export function splitFrames(text: string, max: number): string[] {
  return text
    .split(/^[^\S\n]*(?:#{1,6}[^\S\n]*)?(?:frame|slide|screen|chapter|panel)[^\S\n]*\d+[^\S\n]*[:.\-]?/gim)
    .map((chunk) => {
      const lines = chunk.split("\n");
      // What trails the marker is sometimes the model's outline label and
      // sometimes the copy itself, so the two are told apart rather than
      // always keeping or always dropping the remainder.
      if (lines.length && isLabelLike(lines[0])) lines.shift();
      return cleanCopy(lines.join("\n")).replace(/^\s*\([^)]{1,24}\)\s*[:.\-]?\s*/, "");
    })
    .filter((s) => s.length > 3)
    .slice(0, max);
}

/**
 * True for an outline heading like "Hook/Question" or "Role Spotlight with
 * Dramatic Reveal", false for copy. Quotation marks and sentence punctuation
 * are the tells that a line is meant to be read.
 */
function isLabelLike(line: string): boolean {
  const s = line.replace(/\*/g, "").trim();
  if (!s || s.length > 60) return false;
  if (/["“”'‘’]/.test(s)) return false;
  if (/[.!?]\s*$/.test(s)) return false;

  if (s.includes("/")) return true;

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 8) return false;
  const capitalized = words.filter((w) => /^[A-Z]/.test(w)).length;
  return words.length > 0 && capitalized / words.length >= 0.5;
}

/**
 * True for "#c89858", false for "#decade".
 *
 * The prompts hand the model the brand palette as hex codes, and those were
 * being scraped back out as hashtags and posted. Requiring a digit keeps real
 * words that happen to use only hex letters.
 */
function isHexColor(tag: string): boolean {
  const body = tag.slice(1);
  if (!/^[0-9a-fA-F]+$/.test(body)) return false;
  if (!/[0-9]/.test(body)) return false;
  return body.length === 3 || body.length === 4 || body.length === 6 || body.length === 8;
}

/** Coerces a model's hashtag list into well formed tags, or null if unusable. */
export function normalizeHashtags(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  return cleanHashtagList(raw.map((t) => String(t)));
}

/** Shared filter for tags from a JSON field or scraped out of prose. */
export function cleanHashtagList(raw: string[]): string[] | null {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const entry of raw) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const tag = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

    if (!/^#\w+$/.test(tag)) continue;
    if (isHexColor(tag)) continue;
    if (/^#\d+$/.test(tag)) continue; // Instagram rejects all-numeric tags

    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }

  return tags.length ? tags : null;
}

/**
 * Accepts a model-chosen accent only if it will actually read on the artwork.
 *
 * The grounds are near black, so a dark accent disappears and a pure white one
 * flattens the palette. Relative luminance is checked against both ends, and
 * anything outside the band is rejected so the piece keeps its look's own
 * accent rather than rendering something illegible.
 */
export function validateAccent(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const hex = raw.trim().toLowerCase();
  const m = hex.match(/^#?([0-9a-f]{6})$/);
  if (!m) return null;

  const value = m[1];
  const channel = (at: number) => {
    const c = parseInt(value.slice(at, at + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  if (luminance < 0.12 || luminance > 0.82) return null;

  return `#${value}`;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, a: 1, single: 1, just: 1,
  two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/**
 * Reads a requested frame or slide count out of a free-text steer.
 *
 * "just one", "1 frame" and "make it 3 slides" all have to win over the
 * agent's default, because the whole point of the steer box is that the person
 * asked for something specific.
 */
export function requestedCount(steer: string | undefined, fallback: number, max: number): number {
  if (!steer) return fallback;
  const text = steer.toLowerCase();

  const digit = text.match(/(\d+)\s*(?:frame|slide|screen|card|story|panel|image)/);
  if (digit) {
    const value = parseInt(digit[1], 10);
    if (value >= 1 && value <= max) return value;
  }

  const word = text.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|single)\b\s*(?:frame|slide|screen|card|story|panel|image)/
  );
  if (word) {
    const value = NUMBER_WORDS[word[1]];
    if (value >= 1 && value <= max) return value;
  }

  if (/\b(just|only|single)\s+(one|1)\b/.test(text) || /\bone\s+(frame|slide|screen|card|story)\b/.test(text)) {
    return 1;
  }

  return fallback;
}

/**
 * Shared voice rules appended to every generation prompt.
 *
 * These exist because the models kept returning a formatted deliverable (an
 * outline with headings and production notes) when what the renderer needs is
 * the words that go on the image.
 */
export const COPY_RULES = `
Output rules, follow exactly:
- Return ONLY the JSON described above. No preamble, no markdown fences, no commentary, no explaining your choices.
- Every string is finished copy that a reader will see. Never include headings, labels, numbering, art direction, background descriptions, sticker notes, or production cues.
- Never use em dashes. Use a comma or a full stop instead.
- Never write hashtags inside caption, headline or frame text. Tags belong only in the hashtags field.
- Hashtags must be real words people search for. Never turn a hex colour code or any other value from the design notes into a hashtag.
- Lowercase aesthetic, mysterious and playful, never corporate.
- Ground every piece in one concrete detail, scene or line rather than a general pitch for the game. Generic hype like "don't miss out", "you won't believe" or "get ready" is a failure; specificity is the whole job.
- The first five words decide whether someone keeps scrolling. Do not spend them on a warm-up.
- If the request names a specific angle, hook or countdown, the copy must actually say it, in its own words if not the exact phrasing.
- The phone is a shared, neutral device the players pass around. It never lies, watches, betrays or does anything of its own. The betrayal is always one player deceiving another; the phone is only how they pass a hidden role between them.`;
