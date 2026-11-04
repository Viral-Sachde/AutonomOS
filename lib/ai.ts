import { ContentItem, ContentType, Improvement, roles, GenerationMode } from "./design-system";
import {
  contentTemplates,
  buildPrompt,
  getHashtags,
  resolveGenerationInputs,
  noRoleGuidance,
  nonAiFallback,
} from "./content-templates";
import { recordContentUsage, recordImprovementUsage, buildHistoryContext, buildImprovementHistoryContext, pickDesignVariant, getRecentImprovementTitles, loadHistory } from "./history";
import { callAI, withSteer } from "./ai-provider";
import {
  cleanCopy,
  cleanHashtagList,
  extractJson,
  normalizeHashtags,
  requestedCount,
  splitFrames,
  validateAccent,
  COPY_RULES,
} from "./content-parse";
import { assessContent, describeProblems } from "./quality";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The JSON contract appended to each content prompt.
 *
 * The templates in content-templates.ts describe a deliverable (script beats,
 * image descriptions, hashtag rationale). That context is useful for steering
 * the writing, but the renderer needs only the words that land on the card, so
 * this block is appended last and defines the actual output format.
 */
/** Instagram accepts reels between 3 and 90 seconds. */
export const MIN_REEL_SEC = 3;
export const MAX_REEL_SEC = 90;
export const DEFAULT_REEL_SEC = 30;

export function clampDuration(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_REEL_SEC;
  return Math.max(MIN_REEL_SEC, Math.min(MAX_REEL_SEC, n));
}

// GenerationMode lives in design-system.ts, shared by every generator (post,
// reel, carousel, story) rather than declared per-file - a story generator
// that once had its own copy of this concept went stale and ignored it
// entirely while the others honoured it.
export type { GenerationMode } from "./design-system";

// Facts only, never the roster: a role name mentioned here is a role name the
// model reaches for even when none was asked for, which is exactly what
// happened when "no role" still came back centred on Morgana. The roster is
// appended separately, and only when a role is actually in play.
const GAME_FACTS = `"The Resistance Night" is a social deduction party game where 5 to 10 friends lie, bluff and betray each other. It is pass and play on one phone, with no accounts and no data collected.`;

// Derived from the real roster rather than copied, so this can never go stale
// against it again - it silently dropped "The Lovers" for a while by being a
// hand-written list instead of a read of the actual data.
const ROLE_ROSTER = `Hidden roles: ${roles.map((r) => r.name).join(", ")}.`;

/**
 * The free-mode brief. Deliberately short: every extra instruction here is a
 * rail, and rails are what this mode exists to remove. The one thing enforced
 * either way is whether a character is in play at all, since "no role" has to
 * mean no role, not a randomly chosen one the model reached for anyway.
 */
function buildFreePrompt(
  type: ContentType,
  theme: string,
  roleName?: string
): string {
  const context = [
    theme ? `Loose theme to play with: ${theme}.` : "",
    roleName ? `A role worth featuring: ${roleName}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const roleGuidance = roleName ? "" : `\n${noRoleGuidance()}\n`;

  return `Write an Instagram ${type} for a game you know well.

${GAME_FACTS}${roleName ? `\n${ROLE_ROSTER}` : ""}
${context ? `\n${context} Treat that as a starting point, not a requirement.\n` : ""}${roleGuidance}
You are not filling in a template. Pick one concrete angle, specific enough
that it could only be about this game, and commit to it instead of covering
the whole pitch. Go somewhere a formula would not. Write the sharpest ${type}
you can for this game, in the brand voice below.`;
}

function outputContract(type: ContentType, slideCount: number, durationSec: number): string {
  if (type === "carousel") {
    return `
Return ONLY this JSON, ignoring any other output format described above:
{"slides":[{"headline":"...","line":"..."}],"caption":"...","hashtags":["#..."],"accent":"#rrggbb"}

- Produce exactly ${slideCount} slides.
- "headline" is 2 to 6 words. "line" is one short supporting sentence, or "".
- "caption" is the Instagram caption, under 120 words.
- "hashtags" is 12 to 15 tags, each starting with #.
- "accent" is a #rrggbb colour that suits this piece, readable on a near-black background. Stay in the brand world: gold #c89858, champagne #f4e8c8, ruby #c8324a, emerald #3fb083, steel #8a92b8, or a considered variation.
${COPY_RULES}`;
  }

  if (type === "reel") {
    // Roughly two spoken words per second, trimmed to leave room to breathe.
    const words = Math.max(8, Math.round(durationSec * 2 * 0.85));
    return `
Return ONLY this JSON, ignoring any other output format described above:
{"script":"...","caption":"...","hashtags":["#..."],"accent":"#rrggbb"}

- The reel runs ${durationSec} seconds. Write a script that is spoken comfortably in ${durationSec} seconds, roughly ${words} words in total. Do not exceed it.
- "script" is the spoken or on-screen narration only, as plain sentences separated by newlines. No timestamps, no shot descriptions, no music or transition notes.
- "caption" is the Instagram caption, under 120 words.
- "hashtags" is 12 to 15 tags, each starting with #.
- "accent" is a #rrggbb colour that suits this piece, readable on a near-black background. Stay in the brand world: gold #c89858, champagne #f4e8c8, ruby #c8324a, emerald #3fb083, steel #8a92b8, or a considered variation.
${COPY_RULES}`;
  }

  return `
Return ONLY this JSON, ignoring any other output format described above:
{"caption":"...","hashtags":["#..."],"accent":"#rrggbb"}

- "caption" is the finished Instagram caption, under 120 words, opening with a scroll-stopping line.
- "hashtags" is 12 to 15 tags, each starting with #.
- "accent" is a #rrggbb colour that suits this piece, readable on a near-black background. Stay in the brand world: gold #c89858, champagne #f4e8c8, ruby #c8324a, emerald #3fb083, steel #8a92b8, or a considered variation.
${COPY_RULES}`;
}


/**
 * Generates, checks, and retries once before settling.
 *
 * Free-form briefs mean the model can miss in ways a template never allowed,
 * so output is assessed rather than trusted. A failed first attempt is retried
 * with the specific problems fed back, which fixes most of them.
 *
 * This never comes back empty. The operator asked for a piece, not a verdict
 * on whether one was possible, so a second attempt that still has problems is
 * returned anyway rather than thrown away - logged for whoever reads the
 * server logs, but not the operator's to debug from a dead end.
 */
export async function generateContent(
  type: ContentType,
  theme?: string,
  roleId?: string,
  agentId = "content-writer",
  steer?: string,
  opts: { count?: number; durationSec?: number; mode?: GenerationMode } = {}
): Promise<ContentItem> {
  let lastProblems = "";
  let lastItem: ContentItem | null = null;

  const mode = opts.mode || "template";
  const forbidRoleNames = mode === "free" && !(roleId || "").trim();

  // Resolved once and held fixed across every retry attempt, instead of
  // being re-resolved inside the per-attempt call. Template mode's "nothing
  // specified" path picks randomly, so re-resolving on each attempt meant a
  // retry could land on a completely different theme or role than the one
  // its "fix exactly that" feedback was actually describing.
  const { theme: selectedTheme, role: selectedRole } = resolveGenerationInputs(mode, theme, roleId);
  const slideCount = opts.count
    ? Math.max(2, Math.min(10, Math.round(opts.count)))
    : requestedCount(steer, 6, 10);
  const durationSec = clampDuration(opts.durationSec ?? DEFAULT_REEL_SEC);

  // A role is in play whenever selectedRole resolved to one, whether the
  // operator named it or the template auto-picked it - the prompt says so
  // explicitly either way, so the gate can check it was not dropped.
  const expectedRole = selectedRole?.name;
  const expectedCount = type === "carousel" ? slideCount : undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    const note = lastProblems
      ? `${steer || ""}\n\nYour previous attempt was rejected: ${lastProblems}. Fix exactly that.`.trim()
      : steer;

    const item = await generateOnce(
      type,
      selectedTheme,
      selectedRole,
      roleId,
      agentId,
      note,
      slideCount,
      durationSec,
      mode
    );
    const verdict = assessContent(item, { steer, forbidRoleNames, expectedRole, expectedCount });
    if (verdict.ok) return item;

    lastItem = item;
    lastProblems = describeProblems(verdict.problems);
    console.warn(`${type} did not clear quality (attempt ${attempt + 1}): ${lastProblems}`);
  }

  console.warn(`Shipping ${type} unresolved after 3 attempts: ${lastProblems}`);
  return lastItem!;
}

async function generateOnce(
  type: ContentType,
  selectedTheme: string,
  selectedRole: ReturnType<typeof resolveGenerationInputs>["role"],
  roleId: string | undefined,
  agentId: string,
  steer: string | undefined,
  slideCount: number,
  durationSec: number,
  mode: GenerationMode
): Promise<ContentItem> {
  await loadHistory();

  const template = contentTemplates.find((t) => t.type === type);
  if (!template) throw new Error(`Unknown content type: ${type}`);

  const variant = pickDesignVariant();

  // Either part can be absent now, so the title is assembled from whatever
  // actually applies rather than assuming both.
  const subject =
    [selectedRole?.name, selectedTheme].filter(Boolean).join(", ") || "the resistance night";
  const computedTitle = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${subject}`;
  const captionFallback = selectedTheme
    ? `${selectedTheme}, the resistance night`
    : "the resistance night";

  // Free mode gets the accent as a suggestion rather than a direction, since
  // choosing the look is part of what it is for.
  const visualNote =
    mode === "free"
      ? `\n\nThe artwork palette is ink-black grounds with gold, champagne, ruby, emerald and cool steel. Choose the accent that suits what you wrote.`
      : `\n\nVisual direction for this piece: "${variant.id}" style. ${variant.motif}. Layout: ${variant.layout}. Primary accent: ${variant.accent}.`;

  const base =
    mode === "free"
      ? buildFreePrompt(type, selectedTheme, selectedRole?.name)
      : buildPrompt(template, selectedTheme, selectedRole);

  const prompt = base + buildHistoryContext() + visualNote
    + `\n${outputContract(type, slideCount, durationSec)}`;

  let caption: string;
  let title: string;
  let slides: string[] | undefined;
  let reelScript: string | undefined;
  let hashtags: string[];
  let accentColor: string | undefined;

  const aiText = await callAI(withSteer(prompt, steer));
  const parsed = aiText
    ? extractJson<{ caption?: string; hashtags?: unknown; script?: string; accent?: unknown; slides?: { headline?: string; line?: string }[] }>(aiText)
    : null;

  if (parsed) {
    // Rejected outright if it would not read on the dark ground, in which case
    // the piece keeps its look's own accent.
    accentColor = validateAccent(parsed.accent) || undefined;
    caption = cleanCopy(parsed.caption || "");

    if (type === "carousel" && parsed.slides?.length) {
      slides = parsed.slides
        .map((s) => [cleanCopy(s.headline || ""), cleanCopy(s.line || "")].filter(Boolean).join("\n"))
        .filter(Boolean)
        .slice(0, slideCount);
    }
    if (type === "reel") {
      reelScript = cleanCopy(parsed.script || "");
    }

    if (!caption) caption = captionFallback;
    hashtags = normalizeHashtags(parsed.hashtags) || getHashtags();
    title = computedTitle;
  } else if (aiText) {
    // The model ignored the JSON contract. Strip the scaffolding out of the
    // prose so headings and art direction never reach the card.
    const text = cleanCopy(aiText);

    if (type === "carousel") {
      slides = splitFrames(aiText, slideCount);
    }
    if (type === "reel") {
      reelScript = text;
    }

    caption = text.split(/\n{2,}/)[0]?.slice(0, 600) || captionFallback;

    // Scraped from prose, so this picks up the hex codes in the design notes
    // as readily as real tags. The filter drops them.
    hashtags = cleanHashtagList(aiText.match(/#\w+/g) || []) || getHashtags();
    title = computedTitle;
  } else {
    title = computedTitle;
    hashtags = getHashtags();
    const fallback = nonAiFallback(type, selectedTheme, selectedRole);
    caption = cleanCopy(fallback.caption) || captionFallback;
    if (type === "carousel" && fallback.slides) {
      slides = fallback.slides.map(cleanCopy).slice(0, slideCount);
    }
    if (type === "reel" && fallback.reelScript) {
      reelScript = cleanCopy(fallback.reelScript);
    }
  }

  const hook = caption.split("\n")[0].slice(0, 80);
  recordContentUsage({
    theme: selectedTheme,
    roleId: selectedRole?.id || roleId || "",
    type,
    hook,
    designVariant: variant.id,
  });

  return {
    id: generateId(),
    type,
    title,
    caption,
    hashtags,
    slides,
    reelScript,
    durationSec: type === "reel" ? durationSec : undefined,
    accentColor,
    generationMode: mode,
    status: "pending",
    createdAt: new Date().toISOString(),
    theme: selectedTheme,
    agentId,
  };
}

export async function generateImprovements(steer?: string): Promise<Improvement[]> {
  await loadHistory();

  const categories: Improvement["category"][] = ["ux", "feature", "performance", "design", "engagement"];

  const improvementIdeas: Omit<Improvement, "id" | "createdAt" | "status">[] = [
    {
      title: "Add haptic feedback on role reveal",
      description: "Trigger device vibration when a player reveals their role during pass-and-play. Adds tactile drama to the reveal moment.",
      category: "ux",
      priority: "medium",
      filesToChange: ["src/components/PassAndPlay.tsx"],
      codeChanges: `// In the reveal handler, add:\nif (navigator.vibrate) navigator.vibrate([50, 30, 100]);`,
    },
    {
      title: "Add sound effects for mission results",
      description: "Play a triumphant chord on mission success and an ominous tone on failure. Use Web Audio API for zero-latency playback.",
      category: "engagement",
      priority: "high",
      filesToChange: ["src/components/MainGame.tsx"],
    },
    {
      title: "Animated role card flip effect",
      description: "Replace the current fade-in role reveal with a 3D card flip animation using CSS transforms. More dramatic and Instagram-worthy.",
      category: "design",
      priority: "medium",
      filesToChange: ["src/components/PassAndPlay.tsx"],
    },
    {
      title: "Add game statistics tracker",
      description: "Track win rates per role, most common assassination targets, average game length. Store in localStorage. Gives players reasons to keep playing.",
      category: "feature",
      priority: "high",
      filesToChange: ["src/components/MainGame.tsx", "src/utils/gameUtils.ts"],
    },
    {
      title: "Optimize SVG portrait rendering",
      description: "Memoize portrait components with React.memo to prevent re-renders during game phase transitions. Currently re-rendering 7+ SVGs on every state change.",
      category: "performance",
      priority: "low",
      filesToChange: ["src/components/Art.tsx"],
      codeChanges: `// Wrap each portrait with React.memo:\nexport const MerlinPortrait = React.memo(function MerlinPortrait({ size }: { size: number }) { ... });`,
    },
    {
      title: "Share game results as story card",
      description: "Generate a shareable image (using canvas) showing game outcome, roles revealed, and the game's castle aesthetic. One-tap share to Instagram Stories.",
      category: "engagement",
      priority: "critical",
      filesToChange: ["src/components/MainGame.tsx"],
    },
    {
      title: "Add dark mode toggle with moonrise animation",
      description: "Add an alternative parchment-light theme. Toggle animates a moon rising/setting. Expands accessibility while keeping the medieval aesthetic.",
      category: "design",
      priority: "low",
      filesToChange: ["src/index.css", "src/App.tsx"],
    },
    {
      title: "Implement game invite via QR code",
      description: "Generate a QR code containing a deep link to start a game with pre-configured player count and roles. Perfect for in-person game nights.",
      category: "feature",
      priority: "medium",
      filesToChange: ["src/components/HomeScreen.tsx"],
    },
  ];

  const improvementPrompt = `You are a game development consultant analyzing "The Resistance Night," a social deduction party game built with React + Vite + Capacitor.${buildImprovementHistoryContext()}

The game features:
- 5-10 player support with hidden roles (Merlin, Assassin, Percival, Morgana, Mordred, Oberon, Lovers)
- Pass-and-play role reveal system
- Mission voting and party selection
- Assassination phase
- Beautiful medieval dark aesthetic (ink-black, gold, ruby red)
- SVG character portraits

Generate 5 specific, actionable improvement suggestions. For each, provide:
1. title (short, specific)
2. description (2-3 sentences explaining the improvement and its impact)
3. category (one of: ux, feature, performance, design, engagement)
4. priority (one of: low, medium, high, critical)
5. filesToChange (array of file paths that would need modification)
6. codeChanges (optional: a brief code snippet showing the key change)

Return as JSON array. Focus on improvements that would increase player engagement, shareability, and retention.`;

  const aiText = await callAI(withSteer(improvementPrompt, steer));

  if (aiText) {
    try {
      const jsonMatch = aiText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const results: Improvement[] = parsed.map((item: any) => ({
          id: generateId(),
          title: item.title,
          description: item.description,
          category: item.category || "feature",
          priority: item.priority || "medium",
          filesToChange: item.filesToChange,
          codeChanges: item.codeChanges,
          status: "suggested" as const,
          createdAt: new Date().toISOString(),
        }));
        results.forEach((r) => recordImprovementUsage(r.title, r.category));
        return results;
      }
    } catch (e) {
      console.error("Could not parse AI improvements, using defaults:", e);
    }
  }

  const recentTitles = new Set(getRecentImprovementTitles(30));
  const filtered = improvementIdeas.filter((idea) => !recentTitles.has(idea.title));
  const pool = filtered.length >= 5 ? filtered : improvementIdeas;
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const results = shuffled.slice(0, 5).map((item) => ({
    ...item,
    id: generateId(),
    status: "suggested" as const,
    createdAt: new Date().toISOString(),
  }));
  results.forEach((r) => recordImprovementUsage(r.title, r.category));
  return results;
}
