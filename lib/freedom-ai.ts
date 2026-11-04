import { ContentItem } from "./design-system";
import { callAI, getProvider } from "./ai-provider";
import { renderPng } from "./render";

/**
 * Freedom artwork: the model designs each frame from a blank canvas.
 *
 * There is no template, layout family or palette list here on purpose. The only
 * things the model is given are the game's concept, the words for the frame and
 * the limits of the renderer. It decides the visual metaphor, the composition,
 * the colours and the lettering. Every frame is test-rendered before it is kept,
 * and a frame that fails validation falls back to the procedural composer so a
 * bad generation never blocks a post.
 */

const CONCEPT = `THE RESISTANCE NIGHT is a social-deduction party game for 5-10 players on one phone.
Everyone secretly holds a role. Most are loyal Resistance members; a few are Spies hiding in the group.
Each round a leader proposes a team, everyone votes, and the team secretly succeeds or sabotages a mission.
Three failed missions and the Spies win; three successes and the Resistance wins, unless the Assassin
can name Merlin. Roles include Merlin (sees the spies, must stay hidden), Percival (sees two Merlins and
cannot tell which is real), Morgana (spies as Merlin), Mordred (invisible to Merlin), Oberon (a spy
nobody knows), the Assassin (one shot). The feeling is whispered accusations, held eye contact, a
suspiciously calm friend, a vote that goes wrong, candlelit medieval paranoia, laughing while betrayed.
The tagline is "time to lie to your friends".`;

const RENDERER_RULES = `The SVG is rasterised by resvg, so:
- One standalone <svg> with xmlns, width, height and a matching viewBox. No <style>, classes, scripts, <image>, <foreignObject> or external references.
- Fonts available by name only: "Instrument Serif" (display, regular and italic), "Lora" (body, regular and italic), "Cinzel" (caps). Use no other family. Bold is not available; do not rely on font-weight.
- Gradients, filters (feGaussianBlur, feTurbulence, feColorMatrix, feComposite, feDisplacementMap), masks, clipPaths, patterns, blend via opacity, paths, transforms and <textPath> all work.
- Text does not wrap. Break lines yourself with separate <text> elements, measure honestly (a serif at size S averages about 0.42*S per character), and keep every line fully inside the canvas with at least 80px margin.
- The headline must be at least 64px (at least 80px on a 1080 wide canvas), high contrast against whatever is behind it, and never overlap illustration detail that hurts legibility.`;

function frameCopy(item: ContentItem): string[] {
  if (item.type === "carousel" && item.slides?.length) return item.slides.slice(0, 7);
  if (item.type === "story" && item.storyFrames?.length) return item.storyFrames.slice(0, 5);
  return [item.reelScript ? item.title + "\n" + item.caption : item.caption || item.title];
}

function extractSvg(text: string | null): string | null {
  if (!text) return null;
  const m = text.match(/<svg[\s\S]*<\/svg>/i);
  if (!m) return null;
  let svg = m[0];
  if (/<script|<foreignObject|<image\b|<style\b|\son\w+\s*=|(?:href|src)\s*=\s*["'](?!#)/i.test(svg)) return null;
  if (!/xmlns=/.test(svg)) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return svg;
}

/** Rejects SVGs that do not render, render the wrong size, or render as a flat colour. */
function validate(svg: string, w: number, h: number): boolean {
  try {
    const png = renderPng(svg);
    // A real illustration with type and gradients is never a few KB.
    if (png.length < 25_000) return false;
    const head = svg.slice(0, 400);
    const wm = head.match(/\swidth="(\d+(?:\.\d+)?)/);
    const hm = head.match(/\sheight="(\d+(?:\.\d+)?)/);
    return !!wm && !!hm && Math.round(Number(wm[1])) === w && Math.round(Number(hm[1])) === h;
  } catch {
    return false;
  }
}

export function isFreeArtAvailable(): boolean {
  return getProvider() !== "none";
}

/**
 * One art direction shared by every frame of a piece, so a carousel reads as a
 * set while still being invented for this piece alone.
 */
async function artDirection(item: ContentItem, steer: string | undefined, model?: string): Promise<string> {
  const prompt = `${CONCEPT}

You are the art director for one Instagram ${item.type}. Invent a visual identity for it that has never been used
before: no reused template, no stock "castle and moon" unless this specific idea truly demands it.
Piece: "${item.title}". Theme: ${item.theme}.
Copy: ${frameCopy(item).join(" / ").slice(0, 700)}
${steer ? `The operator's idea (follow it): ${steer.slice(0, 600)}\n` : ""}
Answer in 5 short lines, no preamble:
1. THE IDEA: one concrete visual metaphor for this exact moment of the game (specific objects, not abstractions).
2. PALETTE: 4-5 hex colours that suit the idea (dark is optional; light, saturated or monochrome are all fine).
3. COMPOSITION: where the focal point sits, scale, angle, negative space, what is cropped or bleeds off the edge.
4. TEXTURE: the surface and light (ink, torn paper, glass, wax, fog, woodcut hatching, neon, stained glass, etc).
5. LETTERING: how the headline is set (size, case, position, italic or caps, any treatment).`;
  const out = await callAI(prompt, undefined, { model, maxTokens: 700 });
  return (out || "").trim().slice(0, 1400);
}

async function drawFrame(
  item: ContentItem,
  copy: string,
  index: number,
  total: number,
  direction: string,
  w: number,
  h: number,
  deadline: number,
  model?: string
): Promise<string | null> {
  const cta = item.type === "reel" ? "watch the round" : item.type === "carousel" ? "swipe on" : item.type === "story" ? "tap to play" : "link in bio";
  const prompt = `${CONCEPT}

Draw ONE finished ${w}x${h} Instagram frame as raw SVG. You are not bound by any template: invent the
composition, background and lettering for this specific piece. It should look like a one-off illustrated
poster by a confident designer, not a generated layout. Layer it: a considered background (not a flat fill),
a strong focal illustration that expresses the idea in game terms, atmosphere, and the type.

ART DIRECTION (follow it):
${direction || "Invent your own."}

THIS FRAME (${index + 1} of ${total}), source copy:
"""
${copy.slice(0, 600)}
"""
Distil that into an on-image headline of at most 12 words in the game's voice (lowercase, dry, menacing, funny) and,
if it helps, one short italic line beneath. ${index === total - 1 ? `Include a small call to action: "${cta}".` : ""}
Include a small "THE RESISTANCE NIGHT" wordmark somewhere tasteful.

${RENDERER_RULES}

Keep the SVG compact (under about 9KB): reuse <defs>, avoid hundreds of tiny elements.

Output ONLY the SVG, starting with <svg and ending with </svg>. No markdown, no commentary.`;

  for (let attempt = 0; attempt < 2; attempt++) {
    // A second try is only worth it if there is still time inside the function limit.
    if (attempt > 0 && Date.now() > deadline) break;
    const svg = extractSvg(await callAI(prompt, undefined, { model, maxTokens: 16000 }));
    if (svg && validate(svg, w, h)) return svg;
  }
  return null;
}

/**
 * Returns one entry per frame (SVG, or null where generation failed), or null
 * when no AI provider is configured and freedom must use the procedural composer.
 */
export async function generateFreeArt(
  item: ContentItem,
  steer?: string
): Promise<(string | null)[] | null> {
  if (!isFreeArtAvailable()) return null;

  // Artwork gets the strongest model by default; the cheap copy model draws badly.
  // Only Claude takes a per-call model, Gemini keeps its own.
  const model = getProvider() === "claude" ? process.env.FREEDOM_MODEL || "claude-opus-5-5" : undefined;
  const frames = frameCopy(item);
  const tall = item.type === "story";
  const [w, h] = tall ? [1080, 1920] : [1080, 1080];

  const deadline = Date.now() + 140_000;
  const direction = await artDirection(item, steer, model);
  const art = await Promise.all(
    frames.map((copy, i) => drawFrame(item, copy, i, frames.length, direction, w, h, deadline, model))
  );
  return art.some(Boolean) ? art : null;
}
