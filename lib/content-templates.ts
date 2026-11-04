import { ContentType, GenerationMode, roles, themes, hashtagSets } from "./design-system";
import { pickFreshTheme, pickFreshRole } from "./history";

export interface ContentTemplate {
  type: ContentType;
  promptTemplate: string;
}

/**
 * Creative briefs only. Format is owned entirely by the JSON contract
 * appended in ai.ts's outputContract(), so nothing here asks for timestamps,
 * scene labels, image descriptions, or any other field that contract does
 * not capture. Earlier versions asked for both at once, a HOOK/SETUP/CLIMAX
 * timestamped script here and a plain-sentence, no-shot-description script in
 * the contract, and the model had no way to satisfy both: whichever one it
 * followed, the other rejected it. Every field asked for below is one the
 * output JSON actually has a place for.
 */
export const contentTemplates: ContentTemplate[] = [
  {
    type: "reel",
    promptTemplate: `Write the story for a punchy Instagram Reel about "The Resistance Night," a social deduction party game where 5-10 players lie, bluff, and betray friends over one phone.

Theme: {theme}
Featured Role: {role}, {roleTagline}

Ground it in one concrete scene, not a general pitch: the exact second someone
realises they have been fooled, the vote that goes wrong, the look across the
table before the accusation. Build toward a single sharp turn, then land on
why tonight is the night to play. Cut anything that does not earn its seconds.

Visual world for flavour, not for the script: dark ink-black backgrounds, gold
and champagne accents, ruby red for evil moments, castle silhouettes, crescent
moons.`,
  },
  {
    type: "post",
    promptTemplate: `Write an Instagram caption for "The Resistance Night," a social deduction party game.

Theme: {theme}
Featured Role: {role}, {roleTagline}

Voice: mysterious, playful, slightly menacing, lowercase aesthetic, casual but
dramatic. "time to lie to your friends" is the game's energy, not a line to
repeat verbatim every time. Open on something specific enough to stop a
scroll, a moment or a confession rather than a claim about the game in
general. Close on something that invites a real reply, not a generic
"comment below". Emoji sparingly if at all, medieval or mystery only.

5-10 players. hidden roles. one phone. no accounts.`,
  },
  {
    type: "carousel",
    promptTemplate: `Write a slide-by-slide Instagram carousel for "The Resistance Night," a social deduction party game.

Theme: {theme}
Featured Role: {role}, {roleTagline}

Each slide is one clear idea a reader gets in under two seconds: a role, a
rule, a moment of betrayal. Order them so each slide earns the swipe to the
next, cover to payoff. Land the last slide on why tonight is the night to
play, not a generic download prompt.

Visual world for flavour, not for the slides: ink-black or deep-space-blue
backgrounds, champagne headlines, gold accents, ruby red for evil, emerald for
good, castle silhouettes and crescent moons.`,
  },
];

export function pickRandomTheme(): string {
  return pickFreshTheme();
}

export function pickRandomRole() {
  return pickFreshRole();
}

export function getHashtags(count: number = 15): string[] {
  const all = [
    ...hashtagSets.core,
    ...hashtagSets.engagement,
    ...hashtagSets.genre,
    ...hashtagSets.trending,
  ];
  const shuffled = all.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * The named role, or whatever the operator typed.
 *
 * The lists in the dashboard are suggestions, not a vocabulary. An unknown
 * value used to be swapped for a random role, so asking for something outside
 * the list quietly produced a piece about something else entirely.
 */
export function resolveRole(roleId?: string) {
  const wanted = (roleId || "").trim();
  if (!wanted) return pickRandomRole();
  // An explicit "none" means the piece is not about a character at all. A
  // countdown or a launch announcement does not need one.
  if (wanted.toLowerCase() === "none") return null;
  const known = roles.find(
    (r) => r.id === wanted || r.name.toLowerCase() === wanted.toLowerCase()
  );
  if (known) return known;

  return { id: wanted, name: wanted, alliance: "good" as const, tagline: "" };
}

/**
 * Resolves theme and role together with mode. The single place every
 * generator (post, reel, carousel, story) calls before writing anything, so
 * "no role" and "no theme" mean the same thing everywhere: random-from-the-
 * house-list only ever applies to template mode, and free mode with nothing
 * specified gets nothing forced on it rather than a random pick from the same
 * fixed lists.
 */
export function resolveGenerationInputs(
  mode: GenerationMode,
  theme?: string,
  roleId?: string
): { theme: string; role: ReturnType<typeof resolveRole> } {
  const wantedTheme = (theme || "").trim();
  const noTheme = wantedTheme.toLowerCase() === "none";
  const selectedTheme = noTheme
    ? ""
    : wantedTheme || (mode === "template" ? pickRandomTheme() : "");

  const wantedRoleId = (roleId || "").trim();
  const selectedRole = mode === "free" && !wantedRoleId ? null : resolveRole(roleId);

  return { theme: selectedTheme, role: selectedRole };
}

/**
 * What "no role" means in the prompt itself. Shared so every generator rules
 * out the same dodge: a countdown once came back built around a two-person
 * love-or-survival choice, which is the Lovers role in everything but name.
 */
export function noRoleGuidance(): string {
  return `This one is not about any character. Do not name, quote or centre it on
Merlin, the Assassin, Percival, Morgana, Mordred, Oberon or the Lovers, even in
passing, and do not build it around a narrative device that plays as one of
them without the name, such as a two-person romance, a choice between love and
survival, a hidden wizard, or a lone traitor. It is about the game itself, the
night, the whole group of friends, or the event on the calendar, not any one
character's story.`;
}

/**
 * What ships when the model call fails outright - no key configured, a
 * network error, an empty response - the tier below "salvage the model's
 * prose". This used to fall back to a fixed exampleOutput string per type,
 * the literal same caption/slides/script every single time regardless of
 * theme, role or mode, and one written before the JSON contract existed, so
 * it still carried old scene-label scaffolding ("HOOK (0-3s):", "SLIDE 1
 * (Cover):") that the quality gate's scaffolding check does not match and
 * so never caught - it shipped verbatim. Stories already had a bespoke,
 * role-aware fallback for this exact tier; posts, reels and carousels did
 * not, which is the concrete difference behind free mode "escaping the
 * template" for stories but not for the other three.
 */
export function nonAiFallback(
  type: ContentType,
  theme: string,
  role: ReturnType<typeof resolveRole>
): { caption: string; slides?: string[]; reelScript?: string } {
  const roleBeat = role
    ? `${role.name.toLowerCase()}${role.tagline ? ", " + role.tagline.toLowerCase() : ""}, is at this table, and you do not know it yet.`
    : "someone at this table is lying, and they are very good at it.";
  const themeBeat = theme ? `tonight's theme: ${theme.toLowerCase()}.` : "";
  const closer = "the resistance night. one phone, no accounts, five to ten friends who trust each other a little too much.";

  if (type === "carousel") {
    const slides = [
      `know your table\n${roleBeat}`,
      themeBeat ? `${theme}\n${themeBeat}` : `one phone\nno accounts, no data, just the people in the room.`,
      `five to ten players\none night to find out who is lying.`,
      `the resistance night\ntime to lie to your friends.`,
    ].filter(Boolean);
    return { caption: [roleBeat, closer].join(" "), slides };
  }

  if (type === "reel") {
    return {
      caption: [roleBeat, closer].join(" "),
      reelScript: [roleBeat, themeBeat, closer].filter(Boolean).join("\n"),
    };
  }

  return { caption: [roleBeat, themeBeat, closer].filter(Boolean).join(" ") };
}

/** Drops a whole line from the prompt when its subject does not apply. */
function dropLine(prompt: string, startsWith: string): string {
  return prompt
    .split("\n")
    .filter((line) => !line.trim().toLowerCase().startsWith(startsWith.toLowerCase()))
    .join("\n");
}

/**
 * Fills in a template with an already-resolved theme and role. Takes the
 * resolved values rather than raw theme/roleId and re-resolving them here,
 * because this used to call resolveRole/pickRandomTheme independently of
 * resolveGenerationInputs - so in template mode with nothing specified, the
 * role named in the prompt text and the role recorded on the finished
 * ContentItem (title, history, the quality gate's expectedRole check) could
 * each land on a different random pick from the same call.
 */
export function buildPrompt(
  template: ContentTemplate,
  theme: string,
  role: ReturnType<typeof resolveRole>
): string {
  let prompt = template.promptTemplate;

  if (!theme) {
    prompt = dropLine(prompt, "Theme:");
  } else {
    prompt = prompt.replace("{theme}", theme);
  }

  if (!role) {
    prompt = dropLine(prompt, "Featured Role:");
  } else {
    const roleLine = role.tagline ? `${role.name}, ${role.tagline}` : role.name;
    prompt = prompt
      // Combined first, so a role with no tagline leaves no dangling comma.
      .replace("{role}, {roleTagline}", roleLine)
      .replace("{role}", role.name)
      .replace("{roleTagline}", role.tagline);
  }

  return prompt;
}
