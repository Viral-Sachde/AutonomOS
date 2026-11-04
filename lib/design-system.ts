export const colors = {
  inkBlack: "#141a3e",
  twilightIndigo: "#1c2454",
  vintageGrape: "#2d3a6e",
  coolSteel: "#8a92b8",
  strawberryRed: "#c8324a",
  deepSpaceBlue: "#0d1d3d",
  gold: "#c89858",
  champagne: "#f4e8c8",
  parchment: "#faf3e3",
  paper: "#1f2858",
  emerald: "#3fb083",
} as const;

export const fonts = {
  display: '"Instrument Serif", Georgia, serif',
  body: '"Lora", serif',
  accent: '"Newsreader", Georgia, serif',
} as const;

export const contentTypes = ["reel", "post", "carousel", "story"] as const;
export type ContentType = (typeof contentTypes)[number];

/**
 * How an item's artwork is made. "auto" hashes the item onto one of the fixed
 * templates, "template" pins one, "freedom" invents a composition from `seed`.
 */
export interface DesignChoice {
  mode: "auto" | "template" | "freedom";
  template?: string;
  seed?: number;
  /**
   * Freedom artwork written from scratch by the model, one SVG per frame (null
   * where a frame fell back to the procedural composer). Server-side only: it
   * is stripped from anything sent to the browser, which sees `artCount`.
   */
  art?: (string | null)[];
  artCount?: number;
}

/** Copy of an item that is safe and small enough to send to the dashboard. */
export function stripArt(item: ContentItem): ContentItem {
  if (!item.design?.art) return item;
  return {
    ...item,
    design: { ...item.design, art: undefined, artCount: item.design.art.filter(Boolean).length },
  };
}

export const templateOptions: { id: string; label: string }[] = [
  { id: "castle-moonrise", label: "castle moonrise" },
  { id: "twilight-tower", label: "twilight tower" },
  { id: "starfield-sigil", label: "starfield sigil" },
  { id: "crown-dagger", label: "crown & dagger" },
  { id: "ruby-throne", label: "ruby throne" },
  { id: "crypt-reveal", label: "crypt reveal" },
  { id: "shadow-council", label: "shadow council" },
  { id: "gold-manuscript", label: "gold manuscript" },
  { id: "emerald-forest", label: "emerald forest" },
  { id: "blood-moon", label: "blood moon" },
  { id: "dawn-banner", label: "dawn banner" },
  { id: "knight-vigil", label: "knight vigil" },
];

/**
 * How a piece is written, shared by every content type.
 *
 * "template" is the combinatorial house style: a curated brief crossed with a
 * theme, a role and a design variant. "free" hands the model the brand and
 * the operator's brief and nothing else, picking its own angle. Lives here
 * rather than in one type's own module so every generator (post, reel,
 * carousel, story) resolves theme, role and artwork the same way - a story
 * generator that grew its own copy of this once already went stale and
 * ignored "no role" entirely while the others honoured it.
 */
export type GenerationMode = "template" | "free";

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  caption: string;
  hashtags: string[];
  slides?: string[];
  reelScript?: string;
  /** Target length of a reel in seconds. Only set on reels. */
  durationSec?: number;
  /** Accent chosen for this piece, as #rrggbb. Falls back to the look's own. */
  accentColor?: string;
  /**
   * How this piece was written. Also decides how its artwork is composed:
   * "free" mixes layout, motif and accent independently instead of picking
   * from the curated catalogue template mode uses. Absent on items from
   * before this existed, which render exactly as they always did.
   */
  generationMode?: GenerationMode;
  storyFrames?: string[];
  svgCode?: string;
  illustrationCategory?: IllustrationCategory;
  platform?: string;
  status: "draft" | "pending" | "approved" | "published" | "rejected";
  createdAt: string;
  scheduledFor?: string;
  theme: string;
  agentId?: string;
  /** Public raw URLs of the rendered images, filled in at publish time. */
  imageUrls?: string[];
  publishedAt?: string;
  /** Artwork direction chosen on the Generate tab or per card. */
  design?: DesignChoice;
}

export type IllustrationCategory =
  | "role-portrait"
  | "scene"
  | "icon-set"
  | "pattern"
  | "badge"
  | "divider"
  | "social-header"
  | "sticker";

export const illustrationPalette = {
  bg: "#141a3e",
  paper: "#1f2858",
  gold: "#c89858",
  cream: "#f4e8c8",
  ruby: "#c8324a",
  emerald: "#3fb083",
  steel: "#8a92b8",
  deep: "#0d1d3d",
} as const;

export interface Improvement {
  id: string;
  title: string;
  description: string;
  category: "ux" | "feature" | "performance" | "design" | "engagement" | "concept";
  priority: "low" | "medium" | "high" | "critical";
  codeChanges?: string;
  filesToChange?: string[];
  status: "suggested" | "approved" | "pushed" | "rejected";
  createdAt: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  category: "content" | "growth" | "dev";
  icon: string;
  color: string;
  cronSchedule: string;
  cronHuman: string;
  endpoint: string;
  enabled: boolean;
  lastRun?: string;
  lastResult?: string;
  itemsGenerated?: number;
}

export const agentConfigs: AgentConfig[] = [
  {
    id: "content-writer",
    name: "content writer",
    description: "generates instagram reels, posts, and carousels using the compline design system and game lore.",
    category: "content",
    icon: "Sparkles",
    color: "text-gold bg-gold/15",
    cronSchedule: "0 6 * * *",
    cronHuman: "daily at 6:00 AM UTC",
    endpoint: "/api/cron/daily-content",
    enabled: true,
  },
  {
    id: "hashtag-strategist",
    name: "hashtag strategist",
    description: "researches trending hashtags in gaming, party game, and social deduction niches. rotates sets weekly.",
    category: "growth",
    icon: "Hash",
    color: "text-gold bg-gold/15",
    cronSchedule: "0 7 * * *",
    cronHuman: "daily at 7:00 AM UTC",
    endpoint: "/api/cron/hashtags",
    enabled: false,
  },
  {
    id: "story-generator",
    name: "story generator",
    description: "creates instagram story sequences with polls, quizzes, countdowns, and interactive role reveals.",
    category: "content",
    icon: "Smartphone",
    color: "text-strawberry-red bg-strawberry-red/15",
    cronSchedule: "0 8 * * *",
    cronHuman: "daily at 8:00 AM UTC",
    endpoint: "/api/cron/stories",
    enabled: true,
  },
  {
    id: "analytics-reporter",
    name: "analytics reporter",
    description: "weekly performance summary covering top posts, engagement rates, follower growth, and recommendations.",
    category: "growth",
    icon: "BarChart3",
    color: "text-cool-steel bg-cool-steel/15",
    cronSchedule: "0 9 * * 1",
    cronHuman: "every monday at 9:00 AM UTC",
    endpoint: "/api/cron/analytics",
    enabled: true,
  },
  {
    id: "competitor-scout",
    name: "competitor scout",
    description: "analyzes marketing from similar party and deduction games. surfaces content gaps and trending formats.",
    category: "growth",
    icon: "Radar",
    color: "text-strawberry-red bg-strawberry-red/15",
    cronSchedule: "0 12 * * 5",
    cronHuman: "every friday at 12:00 PM UTC",
    endpoint: "/api/cron/competitor",
    enabled: true,
  },
  {
    id: "code-improver",
    name: "game improver",
    description: "scans the game codebase for UX, performance, design, and engagement improvements you can push directly.",
    category: "dev",
    icon: "Code2",
    color: "text-gold bg-gold/15",
    cronSchedule: "0 12 * * 1",
    cronHuman: "every monday at 12:00 PM UTC",
    endpoint: "/api/cron/improvements",
    enabled: true,
  },
  {
    id: "concept-polisher",
    name: "game concept polisher",
    description: "refines game mechanics, polishes the core concept, and builds new feature specs based on player experience analysis.",
    category: "dev",
    icon: "Gem",
    color: "text-emerald bg-emerald/15",
    cronSchedule: "0 12 * * 3",
    cronHuman: "every wednesday at 12:00 PM UTC",
    endpoint: "/api/cron/concept",
    enabled: true,
  },
  {
    id: "trend-rider",
    name: "trend rider",
    description: "monitors trending topics in gaming, party games, and pop culture. generates reactive content when something relevant spikes.",
    category: "growth",
    icon: "TrendingUp",
    color: "text-strawberry-red bg-strawberry-red/15",
    cronSchedule: "0 10 * * *",
    cronHuman: "daily at 10:00 AM UTC",
    endpoint: "/api/cron/trends",
    enabled: true,
  },
  {
    id: "content-calendar",
    name: "content calendar",
    description: "plans the weekly content mix across formats and themes. ensures balanced coverage and prevents repetition across all agents.",
    category: "content",
    icon: "CalendarDays",
    color: "text-cool-steel bg-cool-steel/15",
    cronSchedule: "0 5 * * 1",
    cronHuman: "every monday at 5:00 AM UTC",
    endpoint: "/api/cron/calendar",
    enabled: true,
  },
  {
    id: "illustration-studio",
    name: "illustration studio",
    description: "generates unique SVG illustrations in the compline palette. builds a reusable library of role portraits, scene vignettes, icons, patterns, badges, and social headers.",
    category: "content",
    icon: "Palette",
    color: "text-gold bg-gold/15",
    cronSchedule: "0 11 * * 2,4",
    cronHuman: "tuesday and thursday at 11:00 AM UTC",
    endpoint: "/api/cron/illustrations",
    enabled: true,
  },
];

export const themes = [
  "deception & trust",
  "medieval mystery",
  "party night vibes",
  "role reveal drama",
  "friendship chaos",
  "strategy & bluffing",
  "dark castle aesthetic",
  "good vs evil",
  "game night essentials",
  "social deduction tips",
] as const;

export const roles = [
  { id: "merlin", name: "Merlin", alliance: "good", tagline: "The all-seeing wizard who must stay hidden" },
  { id: "assassin", name: "Assassin", alliance: "evil", tagline: "One shot to steal victory from the good" },
  { id: "percy", name: "Percival", alliance: "good", tagline: "The knight who sees through the fog" },
  { id: "morgana", name: "Morgana", alliance: "evil", tagline: "The enchantress who wears Merlin's face" },
  { id: "mordred", name: "Mordred", alliance: "evil", tagline: "The shadow that even Merlin cannot see" },
  { id: "oberon", name: "Oberon", alliance: "evil", tagline: "The lone wolf of darkness" },
  { id: "lovers", name: "The Lovers", alliance: "good", tagline: "Bound by trust in a world of lies" },
] as const;

export const hashtagSets = {
  core: ["#TheResistanceNight", "#PartyGame", "#SocialDeduction", "#HiddenRoles"],
  engagement: ["#GameNight", "#BoardGames", "#FriendsNight", "#PartyVibes"],
  genre: ["#Bluffing", "#MedievalGame", "#DeceptionGame", "#HiddenRoles"],
  trending: ["#IndieGame", "#MobileGame", "#TabletopGaming", "#GameDev"],
} as const;
