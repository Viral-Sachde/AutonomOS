import path from "path";
import fs from "fs";
import { Resvg } from "@resvg/resvg-js";
import { ContentItem, colors } from "./design-system";
import { pickDesignVariant } from "./history";
import { putBinary } from "./media-store";
import { isStoreConfigured } from "./store";
import { stripHashtags, stripEmDashes } from "./content-parse";

/**
 * Turns a ContentItem into branded PNGs and puts them somewhere Instagram can
 * fetch them.
 *
 * This exists because the Graph API never accepts an upload - it takes an
 * `image_url` and fetches it itself. So every publish needs a real, public,
 * raster image, which is what this module produces.
 *
 * The composer is a small design system rather than one template: six layout
 * families (skyline, emblem, split, manuscript, radial, banner), a library of
 * generated vector artwork (parallax battlements, starfields, fog, filigree,
 * heraldry) and a four-level type scale. Every ContentItem is deterministically
 * mapped onto one of the twelve design variants so a feed never repeats itself.
 *
 * resvg constraints this file works inside: static SVG only, no CSS/classes, no
 * external assets, and only the fonts in assets/fonts. Variable-font weight
 * axes are NOT honoured by resvg, so "bold" is faked with a same-colour stroke
 * (see `faux`). Filters (feGaussianBlur, feTurbulence, feComponentTransfer),
 * masks, clipPaths and gradients all render correctly and are used heavily.
 */

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const FONTS = [
  path.join(FONT_DIR, "InstrumentSerif-Regular.ttf"),
  path.join(FONT_DIR, "InstrumentSerif-Italic.ttf"),
  path.join(FONT_DIR, "Lora.ttf"),
  path.join(FONT_DIR, "Lora-Italic.ttf"),
  path.join(FONT_DIR, "Cinzel.ttf"),
];

let presentFonts: string[] | null = null;

/**
 * resvg font settings built from the fonts actually on disk.
 *
 * Handing resvg a path that does not exist throws, which previously failed the
 * whole publish and left nothing uploaded. A serverless bundle missing its
 * fonts is a deployment problem, so this degrades to system fonts and says so
 * in the log rather than taking the publish down with it.
 */
function fontOptions() {
  if (presentFonts === null) {
    presentFonts = FONTS.filter((f) => {
      try {
        return fs.existsSync(f);
      } catch {
        return false;
      }
    });
    if (presentFonts.length < FONTS.length) {
      console.error(
        `Only ${presentFonts.length} of ${FONTS.length} brand fonts found under ${FONT_DIR}. ` +
          "Check outputFileTracingIncludes in next.config.js."
      );
    }
  }
  return {
    fontFiles: presentFonts,
    loadSystemFonts: presentFonts.length === 0,
    defaultFontFamily: BODY,
  };
}

const DISPLAY = "Instrument Serif";
const BODY = "Lora";
const CAPS = "Cinzel";

const SQUARE = { w: 1080, h: 1080 };
const STORY = { w: 1080, h: 1920 };

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ------------------------------------------------------------------ *
 * Deterministic randomness
 * ------------------------------------------------------------------ */

/**
 * The artwork is procedural, so it needs a random source - but re-rendering the
 * same item must produce the same picture (Instagram caches by URL, and a
 * republish that silently changes the art is a bug). mulberry32 seeded from the
 * item id gives stable noise.
 */
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = (r: Rng, lo: number, hi: number) => lo + r() * (hi - lo);
const rint = (r: Rng, lo: number, hi: number) => Math.floor(rnd(r, lo, hi + 0.999));
const n = (v: number) => Math.round(v * 100) / 100;

/* ------------------------------------------------------------------ *
 * Colour maths - mixes palette colours, never invents a hue
 * ------------------------------------------------------------------ */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(c: [number, number, number]): string {
  return (
    "#" +
    c
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Linear blend between two colours. `t` 0 = a, 1 = b. */
function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

const darken = (c: string, t: number) => mix(c, "#000000", t);
const lighten = (c: string, t: number) => mix(c, "#ffffff", t);

/* ------------------------------------------------------------------ *
 * Text measurement
 * ------------------------------------------------------------------ */

/**
 * Real glyph measurement instead of a guessed characters-per-line ratio.
 *
 * resvg exposes the rendered bounding box, so each word is measured once at a
 * reference size and cached; font metrics scale linearly, so every other size
 * is a multiply. That keeps wrapping honest across three fonts with very
 * different widths (Instrument Serif is condensed, Cinzel is wide) without
 * paying a render per candidate line.
 */
const REF_SIZE = 100;
const wordCache = new Map<string, number>();

function measureAtRef(word: string, family: string, italic: boolean): number {
  const key = family + "|" + (italic ? "i" : "n") + "|" + word;
  const hit = wordCache.get(key);
  if (hit !== undefined) return hit;

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="12000" height="400">' +
    '<text x="0" y="300" font-family="' +
    family +
    '" font-size="' +
    REF_SIZE +
    '"' +
    (italic ? ' font-style="italic"' : "") +
    ' fill="#000">' +
    esc(word) +
    "</text></svg>";

  // Character estimate is the fallback if resvg cannot measure the string.
  let width = word.length * REF_SIZE * 0.5;
  try {
    const box = new Resvg(svg, {
      font: fontOptions(),
    }).getBBox();
    // Ink box excludes side bearings; 3% covers those plus inter-word kerning.
    if (box && box.width > 0) width = (box.x + box.width) * 1.03;
  } catch {
    /* keep the estimate */
  }
  wordCache.set(key, width);
  return width;
}

interface TypeSpec {
  family: string;
  size: number;
  italic?: boolean;
  tracking?: number;
}

function spaceWidth(family: string, italic: boolean): number {
  return Math.max(
    REF_SIZE * 0.18,
    measureAtRef("n n", family, italic) - 2 * measureAtRef("n", family, italic)
  );
}

function textWidth(text: string, spec: TypeSpec): number {
  const scale = spec.size / REF_SIZE;
  const words = text.split(" ");
  let w = 0;
  for (const word of words) w += measureAtRef(word, spec.family, !!spec.italic) * scale;
  w += spaceWidth(spec.family, !!spec.italic) * scale * Math.max(0, words.length - 1);
  w += (spec.tracking || 0) * Math.max(0, text.length - 1);
  return w;
}

/** Greedy wrap against measured widths. Returns null when it needs more lines. */
function wrapStrict(
  text: string,
  spec: TypeSpec,
  maxWidth: number,
  maxLines: number
): string[] | null {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (!line || textWidth(candidate, spec) <= maxWidth) {
      line = candidate;
      if (textWidth(line, spec) > maxWidth) return null; // single word too wide
    } else {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) return null;
    }
  }
  if (line) lines.push(line);
  return lines.length <= maxLines && lines.length > 0 ? lines : null;
}

/** Last resort: fill `maxLines` and end with an ellipsis rather than overflow. */
function truncateTo(text: string, spec: TypeSpec, maxWidth: number, maxLines: number): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const words = clean.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (!line || textWidth(candidate, spec) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (!lines.length) lines.push(clean.slice(0, 12));

  const last = lines.length - 1;
  if (lines.join(" ").length < clean.length) {
    let candidate = lines[last].replace(/[,.;:—-]+$/, "");
    while (candidate.includes(" ") && textWidth(candidate + "…", spec) > maxWidth) {
      candidate = candidate.slice(0, candidate.lastIndexOf(" "));
    }
    lines[last] = candidate + "…";
  }
  return lines;
}

interface Fitted {
  lines: string[];
  size: number;
  lead: number;
  /** Distance from the first baseline to the visual bottom of the block. */
  height: number;
}

/**
 * Picks the largest size at which the copy fits its box. Display serif wants
 * tight leading, so line height is a ratio of the chosen size rather than a
 * fixed pixel gap - large type stays optically locked up while small type keeps
 * air. (The old renderer used 112px leading on 96px type, which read as loose.)
 */
function fitText(
  text: string,
  family: string,
  maxWidth: number,
  maxLines: number,
  sizes: number[],
  leadRatio: number,
  italic = false
): Fitted {
  for (const size of sizes) {
    const spec: TypeSpec = { family, size, italic };
    const lines = wrapStrict(text, spec, maxWidth, maxLines);
    if (lines) {
      const lead = Math.round(size * leadRatio);
      return { lines, size, lead, height: (lines.length - 1) * lead + size * 0.74 };
    }
  }
  const size = sizes[sizes.length - 1];
  const spec: TypeSpec = { family, size, italic };
  const lines = truncateTo(text, spec, maxWidth, maxLines);
  const lead = Math.round(size * leadRatio);
  return { lines, size, lead, height: (lines.length - 1) * lead + size * 0.74 };
}

/* ------------------------------------------------------------------ *
 * Text emitters
 * ------------------------------------------------------------------ */

type Anchor = "start" | "middle" | "end";

interface TextOpts {
  family?: string;
  size: number;
  fill: string;
  anchor?: Anchor;
  italic?: boolean;
  tracking?: number;
  opacity?: number;
  /** Fakes weight: resvg ignores variable-font wght, a hairline stroke does not. */
  weight?: number;
}

function faux(fill: string, weight?: number, size?: number): string {
  if (!weight || weight < 600 || !size) return "";
  return ' stroke="' + fill + '" stroke-width="' + n(size / 34) + '" stroke-linejoin="round"';
}

function text(x: number, y: number, body: string, o: TextOpts): string {
  return (
    '<text x="' + n(x) + '" y="' + n(y) + '"' +
    ' font-family="' + (o.family || DISPLAY) + '"' +
    ' font-size="' + n(o.size) + '"' +
    (o.italic ? ' font-style="italic"' : "") +
    (o.anchor && o.anchor !== "start" ? ' text-anchor="' + o.anchor + '"' : "") +
    (o.tracking ? ' letter-spacing="' + n(o.tracking) + '"' : "") +
    (o.opacity !== undefined ? ' fill-opacity="' + n(o.opacity) + '"' : "") +
    ' fill="' + o.fill + '"' +
    faux(o.fill, o.weight, o.size) +
    ">" + esc(body) + "</text>"
  );
}

/** Renders a fitted block from its first baseline downward. */
function block(x: number, baseline: number, fitted: Fitted, o: TextOpts): string {
  return fitted.lines
    .map((line, i) => text(x, baseline + i * fitted.lead, line, { ...o, size: fitted.size }))
    .join("\n  ");
}

/** Small caps label: Cinzel, tracked out, always uppercase. */
function label(x: number, y: number, body: string, size: number, fill: string, anchor?: Anchor): string {
  return text(x, y, body.toUpperCase(), {
    family: CAPS,
    size,
    fill,
    anchor,
    tracking: size * 0.3,
  });
}

/** Width of a tracked caps label, needed to draw rules that flank it. */
function labelWidth(body: string, size: number): number {
  return textWidth(body.toUpperCase(), { family: CAPS, size, tracking: size * 0.3 });
}

/* ------------------------------------------------------------------ *
 * Defs accumulator
 * ------------------------------------------------------------------ */

/** Collects gradients/filters/masks and hands back the id to reference. */
class Defs {
  private items: string[] = [];
  private next = 0;
  add(make: (id: string) => string): string {
    const id = "x" + this.next++;
    this.items.push(make(id));
    return id;
  }
  render(): string {
    return this.items.length ? "<defs>" + this.items.join("") + "</defs>" : "";
  }
}

type Stop = [number, string, number];

function linear(d: Defs, stops: Stop[], x1: number, y1: number, x2: number, y2: number): string {
  return d.add(
    (id) =>
      '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' +
      stops
        .map(
          (s) =>
            '<stop offset="' + n(s[0] * 100) + '%" stop-color="' + s[1] + '" stop-opacity="' + n(s[2]) + '"/>'
        )
        .join("") +
      "</linearGradient>"
  );
}

function radial(d: Defs, stops: Stop[], cx: number, cy: number, r: number): string {
  return d.add(
    (id) =>
      '<radialGradient id="' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '">' +
      stops
        .map(
          (s) =>
            '<stop offset="' + n(s[0] * 100) + '%" stop-color="' + s[1] + '" stop-opacity="' + n(s[2]) + '"/>'
        )
        .join("") +
      "</radialGradient>"
  );
}

function blur(d: Defs, std: number): string {
  return d.add(
    (id) =>
      '<filter id="' + id + '" x="-60%" y="-60%" width="220%" height="220%">' +
      '<feGaussianBlur stdDeviation="' + n(std) + '"/></filter>'
  );
}

/* ------------------------------------------------------------------ *
 * Atmosphere
 * ------------------------------------------------------------------ */

/** Film grain. feTurbulence renders in resvg; feComponentTransfer tames it. */
function grain(d: Defs, w: number, h: number, amount: number): string {
  const f = d.add(
    (id) =>
      '<filter id="' + id + '" x="0" y="0" width="100%" height="100%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/>' +
      '<feColorMatrix type="saturate" values="0"/>' +
      '<feComponentTransfer><feFuncA type="linear" slope="0.6" intercept="0"/></feComponentTransfer>' +
      "</filter>"
  );
  return (
    '<rect width="' + w + '" height="' + h + '" filter="url(#' + f + ')" opacity="' + n(amount) +
    '"/>'
  );
}

/** Darkened edges so the eye falls to the centre of the frame. */
function vignette(d: Defs, w: number, h: number, strength: number, tint = "#000000"): string {
  const g = radial(
    d,
    [
      [0, tint, 0],
      [0.62, tint, 0],
      [1, tint, strength],
    ],
    0.5,
    0.5,
    0.78
  );
  return '<rect width="' + w + '" height="' + h + '" fill="url(#' + g + ')"/>';
}

/** Soft horizontal haze bands: cheap depth between silhouette layers. */
function fogBands(
  d: Defs,
  rng: Rng,
  w: number,
  yTop: number,
  yBottom: number,
  count: number,
  color: string
): string {
  const f = blur(d, 34);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const cy = rnd(rng, yTop, yBottom);
    const rx = rnd(rng, w * 0.35, w * 0.78);
    const ry = rnd(rng, 16, 46);
    out.push(
      '<ellipse cx="' + n(rnd(rng, w * 0.1, w * 0.9)) + '" cy="' + n(cy) + '" rx="' + n(rx) +
      '" ry="' + n(ry) + '" fill="' + color + '" opacity="' + n(rnd(rng, 0.05, 0.14)) +
      '" filter="url(#' + f + ')"/>'
    );
  }
  return '<g>' + out.join("") + "</g>";
}

/** Volumetric light shafts falling from a point. */
function lightShafts(
  d: Defs,
  rng: Rng,
  ox: number,
  oy: number,
  spread: number,
  length: number,
  color: string,
  count: number
): string {
  const f = blur(d, 26);
  const g = linear(d, [[0, color, 0.32], [1, color, 0]], 0, 0, 0, 1);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = rnd(rng, -spread, spread);
    const wSpan = rnd(rng, 26, 96);
    const x1 = ox + Math.tan(a) * length - wSpan;
    const x2 = ox + Math.tan(a) * length + wSpan;
    out.push(
      '<path d="M' + n(ox - 10) + ' ' + n(oy) + ' L' + n(x1) + ' ' + n(oy + length) +
      ' L' + n(x2) + ' ' + n(oy + length) + ' L' + n(ox + 10) + ' ' + n(oy) +
      ' Z" fill="url(#' + g + ')" opacity="' + n(rnd(rng, 0.35, 0.9)) + '"/>'
    );
  }
  return '<g filter="url(#' + f + ')">' + out.join("") + "</g>";
}

/* ------------------------------------------------------------------ *
 * Stars
 * ------------------------------------------------------------------ */

/** Concave four-point star - reads as a sparkle where a circle reads as a dot. */
function sparklePath(cx: number, cy: number, r: number): string {
  const q = r * 0.16;
  return (
    "M" + n(cx) + " " + n(cy - r) +
    " C" + n(cx + q) + " " + n(cy - q) + " " + n(cx + q) + " " + n(cy - q) + " " + n(cx + r) + " " + n(cy) +
    " C" + n(cx + q) + " " + n(cy + q) + " " + n(cx + q) + " " + n(cy + q) + " " + n(cx) + " " + n(cy + r) +
    " C" + n(cx - q) + " " + n(cy + q) + " " + n(cx - q) + " " + n(cy + q) + " " + n(cx - r) + " " + n(cy) +
    " C" + n(cx - q) + " " + n(cy - q) + " " + n(cx - q) + " " + n(cy - q) + " " + n(cx) + " " + n(cy - r) +
    " Z"
  );
}

interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Varied starfield: most stars are sub-pixel dust, a handful are bright discs
 * with a halo, and a few are drawn sparkles. Uniform dots look like a texture
 * swatch; this looks like a sky.
 */
function starfield(
  d: Defs,
  rng: Rng,
  region: Region,
  count: number,
  tint: string,
  accent: string
): string {
  const halo = blur(d, 5);
  const dust: string[] = [];
  const bright: string[] = [];
  const sparks: string[] = [];

  for (let i = 0; i < count; i++) {
    const cx = rnd(rng, region.x, region.x + region.w);
    const cy = rnd(rng, region.y, region.y + region.h);
    const roll = rng();
    if (roll > 0.965) {
      const r = rnd(rng, 5, 11);
      sparks.push(
        '<path d="' + sparklePath(cx, cy, r) + '" fill="' + (rng() > 0.5 ? accent : tint) +
        '" opacity="' + n(rnd(rng, 0.55, 0.95)) + '"/>'
      );
      sparks.push(
        '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r * 1.5) + '" fill="' + accent +
        '" opacity="0.18" filter="url(#' + halo + ')"/>'
      );
    } else if (roll > 0.86) {
      const r = rnd(rng, 1.8, 3.1);
      bright.push(
        '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '" fill="' + tint +
        '" opacity="' + n(rnd(rng, 0.65, 1)) + '"/>'
      );
      bright.push(
        '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r * 3.2) + '" fill="' + tint +
        '" opacity="0.16" filter="url(#' + halo + ')"/>'
      );
    } else {
      dust.push(
        '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(rnd(rng, 0.5, 1.5)) + '" fill="' +
        tint + '" opacity="' + n(rnd(rng, 0.12, 0.55)) + '"/>'
      );
    }
  }
  return "<g>" + dust.join("") + bright.join("") + sparks.join("") + "</g>";
}

/* ------------------------------------------------------------------ *
 * Moon
 * ------------------------------------------------------------------ */

/**
 * A lit disc with limb shading, craters and an atmospheric halo. `phase` > 0
 * bites a crescent out of it with a mask (masks render correctly in resvg).
 */
function moon(
  d: Defs,
  rng: Rng,
  cx: number,
  cy: number,
  r: number,
  body: string,
  glowColor: string,
  phase: number
): string {
  const surface = radial(
    d,
    [
      [0, lighten(body, 0.28), 1],
      [0.62, body, 1],
      [1, darken(body, 0.35), 1],
    ],
    0.36,
    0.32,
    0.78
  );
  const halo = radial(
    d,
    [
      [0, glowColor, 0.5],
      [0.35, glowColor, 0.22],
      [1, glowColor, 0],
    ],
    0.5,
    0.5,
    0.5
  );

  let maskAttr = "";
  if (phase > 0) {
    const m = d.add(
      (id) =>
        '<mask id="' + id + '">' +
        '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '" fill="#ffffff"/>' +
        '<circle cx="' + n(cx - r * phase) + '" cy="' + n(cy - r * phase * 0.42) + '" r="' + n(r * 0.96) +
        '" fill="#000000"/></mask>'
    );
    maskAttr = ' mask="url(#' + m + ')"';
  }

  const craters: string[] = [];
  const craterCount = phase > 0 ? 3 : 7;
  for (let i = 0; i < craterCount; i++) {
    const a = rnd(rng, 0, Math.PI * 2);
    const dist = rnd(rng, 0.1, 0.72) * r;
    craters.push(
      '<circle cx="' + n(cx + Math.cos(a) * dist) + '" cy="' + n(cy + Math.sin(a) * dist) +
      '" r="' + n(rnd(rng, r * 0.05, r * 0.16)) + '" fill="' + darken(body, 0.22) +
      '" opacity="' + n(rnd(rng, 0.25, 0.6)) + '"/>'
    );
  }

  return (
    '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r * 3.1) + '" fill="url(#' + halo + ')"/>' +
    "<g" + maskAttr + ">" +
    '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '" fill="url(#' + surface + ')"/>' +
    craters.join("") +
    "</g>" +
    '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '" fill="none" stroke="' +
    lighten(body, 0.4) + '" stroke-opacity="0.35" stroke-width="1"' + maskAttr + "/>"
  );
}

/* ------------------------------------------------------------------ *
 * Battlements
 * ------------------------------------------------------------------ */

interface Tower {
  x: number;
  w: number;
  top: number;
  roof: boolean;
}

interface SkylineOpts {
  towerW: number;
  towerH: number;
  wallW: number;
  towerChance: number;
  roofChance: number;
}

/**
 * Procedural castle profile: crenellated curtain walls interrupted by towers,
 * some of them roofed. Returns the outline plus the tower rectangles so a
 * caller can light windows and fly pennants on the front layer.
 */
function skylinePath(
  w: number,
  bottomY: number,
  baseTop: number,
  rng: Rng,
  o: SkylineOpts
): { d: string; towers: Tower[] } {
  const pts: [number, number][] = [[0, baseTop]];
  const towers: Tower[] = [];
  const merlon = Math.max(8, o.towerW * 0.16);
  let x = 0;

  while (x < w) {
    if (rng() < o.towerChance) {
      const tw = o.towerW * rnd(rng, 0.72, 1.45);
      const th = o.towerH * rnd(rng, 0.55, 1.35);
      const top = baseTop - th;
      const roof = rng() < o.roofChance;
      pts.push([x, top + merlon]);
      if (roof) {
        pts.push([x - tw * 0.14, top + merlon]);
        pts.push([x + tw / 2, top - th * 0.42]);
        pts.push([x + tw * 1.14, top + merlon]);
      } else {
        const teeth = 3;
        const step = tw / (teeth * 2 - 1);
        for (let i = 0; i < teeth * 2 - 1; i++) {
          const yy = i % 2 === 0 ? top : top + merlon;
          pts.push([x + i * step, yy]);
          pts.push([x + (i + 1) * step, yy]);
        }
      }
      pts.push([x + tw, top + merlon]);
      pts.push([x + tw, baseTop]);
      towers.push({ x, w: tw, top, roof });
      x += tw;
    } else {
      // Curtain wall. Each run sits at its own height so the crest is a
      // stepped ridge rather than one dead-level fence across the frame.
      const ww = o.wallW * rnd(rng, 0.5, 1.5);
      const lift = rnd(rng, 0, o.towerH * 0.34);
      const wallTop = baseTop - lift;
      const step = Math.max(30, o.towerW * 0.52);
      pts.push([x, wallTop]);
      let cx = x;
      let up = true;
      while (cx < x + ww) {
        const nx = Math.min(cx + step, x + ww);
        const yy = up ? wallTop - merlon * 1.15 : wallTop;
        pts.push([cx, yy]);
        pts.push([nx, yy]);
        cx = nx;
        up = !up;
      }
      pts.push([x + ww, wallTop]);
      pts.push([x + ww, baseTop]);
      x += ww;
    }
  }

  const body = pts.map((p) => "L" + n(Math.min(p[0], w + 40)) + " " + n(p[1])).join(" ");
  return {
    d: "M-40 " + n(bottomY) + " L-40 " + n(baseTop) + " " + body + " L" + n(w + 40) + " " +
      n(baseTop) + " L" + n(w + 40) + " " + n(bottomY) + " Z",
    towers,
  };
}

/**
 * Three depth-sorted silhouette layers. Far layers are lighter and hazier, the
 * near layer is nearly black with lit windows - that contrast is what makes the
 * skyline read as distance rather than as a sticker.
 */
function battlements(
  d: Defs,
  rng: Rng,
  w: number,
  bottomY: number,
  horizon: number,
  base: string,
  accent: string,
  scale = 1
): string {
  const out: string[] = [];
  const layers = [
    { top: horizon + 26 * scale, color: mix(base, "#ffffff", 0.1), op: 0.4, tw: 54 * scale, th: 96 * scale, blurAmt: 3 },
    { top: horizon + 74 * scale, color: darken(base, 0.35), op: 0.75, tw: 74 * scale, th: 132 * scale, blurAmt: 1.2 },
    { top: horizon + 132 * scale, color: darken(base, 0.72), op: 1, tw: 96 * scale, th: 176 * scale, blurAmt: 0 },
  ];

  layers.forEach((L, i) => {
    const sk = skylinePath(w, bottomY + 10, L.top, rng, {
      towerW: L.tw,
      towerH: L.th,
      wallW: L.tw * 2.4,
      towerChance: 0.42,
      roofChance: 0.45,
    });
    const f = L.blurAmt ? ' filter="url(#' + blur(d, L.blurAmt) + ')"' : "";
    out.push('<path d="' + sk.d + '" fill="' + L.color + '" opacity="' + n(L.op) + '"' + f + "/>");

    if (i === layers.length - 1) {
      // Lit windows and pennants only on the layer closest to the viewer.
      const glow = blur(d, 4);
      const lights: string[] = [];
      // Windows belong to the tower body only - anything lower reads as a
      // firefly hovering over the bottom of the frame.
      const lightFloor = bottomY - 150 * scale;
      for (const t of sk.towers) {
        const usable = Math.max(0, lightFloor - (t.top + 34 * scale));
        const rows = Math.max(1, Math.min(3, Math.floor(usable / (58 * scale))));
        for (let r = 0; r < rows; r++) {
          if (rng() > 0.55) continue;
          const wx = t.x + t.w * rnd(rng, 0.28, 0.62);
          const wy = t.top + 34 * scale + r * 56 * scale;
          if (wy > lightFloor) continue;
          const ww = 9 * scale;
          const wh = 16 * scale;
          lights.push(
            '<path d="M' + n(wx) + ' ' + n(wy + wh) + ' L' + n(wx) + ' ' + n(wy + ww / 2) +
            ' A' + n(ww / 2) + ' ' + n(ww / 2) + ' 0 0 1 ' + n(wx + ww) + ' ' + n(wy + ww / 2) +
            ' L' + n(wx + ww) + ' ' + n(wy + wh) + ' Z" fill="' + accent + '" opacity="' +
            n(rnd(rng, 0.5, 0.95)) + '"/>'
          );
          lights.push(
            '<circle cx="' + n(wx + ww / 2) + '" cy="' + n(wy + wh / 2) + '" r="' + n(ww * 1.7) +
            '" fill="' + accent + '" opacity="0.3" filter="url(#' + glow + ')"/>'
          );
        }
      }
      const roofed = sk.towers.filter((t) => t.roof).slice(0, 3);
      for (const t of roofed) {
        const px = t.x + t.w / 2;
        const py = t.top - (t.top - horizon) * 0.42 - 6;
        const ph = 46 * scale;
        lights.push(
          '<line x1="' + n(px) + '" y1="' + n(py) + '" x2="' + n(px) + '" y2="' + n(py - ph) +
          '" stroke="' + darken(base, 0.72) + '" stroke-width="' + n(2.5 * scale) + '"/>'
        );
        lights.push(
          '<path d="M' + n(px) + ' ' + n(py - ph) + ' L' + n(px + 34 * scale) + ' ' + n(py - ph + 11 * scale) +
          ' L' + n(px) + ' ' + n(py - ph + 22 * scale) + ' Z" fill="' + accent + '" opacity="0.7"/>'
        );
      }
      out.push("<g>" + lights.join("") + "</g>");
    }
  });

  return "<g>" + out.join("") + "</g>";
}

/* ------------------------------------------------------------------ *
 * Ornament
 * ------------------------------------------------------------------ */

/** Scrolling corner flourish, authored in a 0-100 unit box then transformed. */
function filigree(x: number, y: number, size: number, rot: number, color: string, op: number): string {
  const paths = [
    // Long sweep from one edge to the other.
    "M0 96 C0 40 40 0 96 0",
    // Inner echo, held a few units off the sweep.
    "M14 96 C14 50 50 14 96 14",
    // Volute: the scroll that curls back into the corner.
    "M14 96 C14 62 34 44 56 44 C70 44 78 54 74 64 C70 73 58 72 56 63",
    // Counter-curl on the other arm.
    "M96 14 C62 14 44 34 44 56 C44 70 54 78 64 74 C73 70 72 58 63 56",
    // Two small buds hanging off the sweep.
    "M28 74 C36 66 36 56 30 50",
    "M74 28 C66 36 56 36 50 30",
  ];
  const dots: number[][] = [
    [59, 59, 3.6],
    [96, 0, 3],
    [0, 96, 3],
  ];
  return (
    '<g transform="translate(' + n(x) + ' ' + n(y) + ') rotate(' + rot + ') scale(' +
    n(size / 100) + ')" opacity="' + n(op) + '">' +
    paths
      .map(
        (p) =>
          '<path d="' + p + '" fill="none" stroke="' + color +
          '" stroke-width="2.2" stroke-linecap="round"/>'
      )
      .join("") +
    dots.map((c) => '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="' + color + '"/>').join("") +
    "</g>"
  );
}

/** All four corners of a rectangle, rotated to face inward. */
function filigreeFrame(x: number, y: number, w: number, h: number, size: number, color: string, op: number): string {
  return (
    filigree(x, y, size, 0, color, op) +
    filigree(x + w, y, size, 90, color, op) +
    filigree(x + w, y + h, size, 180, color, op) +
    filigree(x, y + h, size, 270, color, op)
  );
}

/** Centred rule with a lozenge in the middle - a typographic breath mark. */
function ornamentRule(cx: number, y: number, width: number, color: string, op = 0.75): string {
  const half = width / 2;
  const gap = 22;
  const g = (x1: number, x2: number) =>
    '<path d="M' + n(x1) + ' ' + n(y) + ' L' + n(x2) + ' ' + n(y) + '" stroke="' + color +
    '" stroke-width="1.4"/>';
  return (
    '<g opacity="' + n(op) + '">' +
    g(cx - half, cx - gap) +
    g(cx + gap, cx + half) +
    '<path d="M' + n(cx) + ' ' + n(y - 8) + ' L' + n(cx + 9) + ' ' + n(y) + ' L' + n(cx) + ' ' +
    n(y + 8) + ' L' + n(cx - 9) + ' ' + n(y) + ' Z" fill="' + color + '"/>' +
    '<circle cx="' + n(cx - gap + 4) + '" cy="' + n(y) + '" r="2" fill="' + color + '"/>' +
    '<circle cx="' + n(cx + gap - 4) + '" cy="' + n(y) + '" r="2" fill="' + color + '"/>' +
    "</g>"
  );
}

/** Thin double border plus corner brackets. Reads as a printed plate edge. */
function plateFrame(w: number, h: number, inset: number, color: string, op: number): string {
  const a = inset;
  const b = inset + 11;
  const t = 34;
  const corner = (x: number, y: number, sx: number, sy: number) =>
    '<path d="M' + n(x) + ' ' + n(y + sy * t) + ' L' + n(x) + ' ' + n(y) + ' L' + n(x + sx * t) +
    ' ' + n(y) + '" fill="none" stroke="' + color + '" stroke-width="3"/>';
  return (
    '<g opacity="' + n(op) + '">' +
    '<rect x="' + a + '" y="' + a + '" width="' + (w - a * 2) + '" height="' + (h - a * 2) +
    '" fill="none" stroke="' + color + '" stroke-width="1.2"/>' +
    '<rect x="' + b + '" y="' + b + '" width="' + (w - b * 2) + '" height="' + (h - b * 2) +
    '" fill="none" stroke="' + color + '" stroke-width="0.7" stroke-opacity="0.6"/>' +
    corner(a, a, 1, 1) +
    corner(w - a, a, -1, 1) +
    corner(a, h - a, 1, -1) +
    corner(w - a, h - a, -1, -1) +
    "</g>"
  );
}

/* ------------------------------------------------------------------ *
 * Heraldry
 * ------------------------------------------------------------------ */

/** Shield outline in a -50..50 unit box. */
const SHIELD_D =
  "M-50 -46 L50 -46 L50 6 C50 40 26 58 0 70 C-26 58 -50 40 -50 6 Z";

const CROWN_D =
  "M-46 18 L-56 -30 L-26 -8 L0 -42 L26 -8 L56 -30 L46 18 Z";

const CHALICE_D =
  "M-30 -40 L30 -40 C30 -6 18 8 4 12 L4 34 L24 34 L24 44 L-24 44 L-24 34 L-4 34 L-4 12 C-18 8 -30 -6 -30 -40 Z";

function daggerPath(len: number): string {
  const b = len / 2;
  return (
    "M0 " + n(-b) +
    " L7 " + n(-b + 22) +
    " L7 " + n(b - 46) +
    " L-7 " + n(b - 46) +
    " L-7 " + n(-b + 22) +
    " Z" +
    " M-26 " + n(b - 46) + " L26 " + n(b - 46) + " L26 " + n(b - 36) + " L-26 " + n(b - 36) + " Z" +
    " M-5 " + n(b - 36) + " L5 " + n(b - 36) + " L5 " + n(b - 12) + " L-5 " + n(b - 12) + " Z"
  );
}

type Sigil = "shield" | "crown" | "dagger" | "star" | "chalice";

/**
 * Circular heraldic device: rings, radial ticks and a central charge. Used as
 * the focal element for the emblem and radial layouts.
 */
function emblem(
  d: Defs,
  rng: Rng,
  cx: number,
  cy: number,
  r: number,
  accent: string,
  ink: string,
  sigil: Sigil
): string {
  const glow = blur(d, 22);
  const ringFill = radial(
    d,
    [
      [0, accent, 0.22],
      [0.7, accent, 0.06],
      [1, accent, 0],
    ],
    0.5,
    0.5,
    0.5
  );

  const ticks: string[] = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const long = i % 3 === 0;
    const r1 = r * 0.86;
    const r2 = r * (long ? 0.94 : 0.9);
    ticks.push(
      '<line x1="' + n(cx + Math.cos(a) * r1) + '" y1="' + n(cy + Math.sin(a) * r1) +
      '" x2="' + n(cx + Math.cos(a) * r2) + '" y2="' + n(cy + Math.sin(a) * r2) +
      '" stroke="' + accent + '" stroke-opacity="' + (long ? "0.8" : "0.4") + '" stroke-width="' +
      (long ? "2.2" : "1.2") + '"/>'
    );
  }

  const rays: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.26;
    const r1 = r * 1.05;
    const r2 = r * rnd(rng, 1.25, 1.62);
    rays.push(
      '<line x1="' + n(cx + Math.cos(a) * r1) + '" y1="' + n(cy + Math.sin(a) * r1) +
      '" x2="' + n(cx + Math.cos(a) * r2) + '" y2="' + n(cy + Math.sin(a) * r2) +
      '" stroke="' + accent + '" stroke-opacity="0.28" stroke-width="1.3"/>'
    );
  }

  const s = r * 0.0105;
  let charge = "";
  if (sigil === "shield") {
    charge =
      '<path d="' + SHIELD_D + '" fill="none" stroke="' + accent + '" stroke-width="3"/>' +
      '<path d="' + SHIELD_D + '" fill="' + accent + '" opacity="0.1"/>' +
      '<path d="M-50 -12 L50 -12" stroke="' + accent + '" stroke-width="2" opacity="0.6"/>' +
      '<path d="' + CROWN_D + '" transform="translate(0 -18) scale(0.5)" fill="' + accent + '" opacity="0.9"/>';
  } else if (sigil === "crown") {
    charge =
      '<path d="' + CROWN_D + '" fill="' + accent + '"/>' +
      '<rect x="-46" y="18" width="92" height="14" fill="' + accent + '"/>' +
      '<circle cx="0" cy="-30" r="7" fill="' + ink + '"/>' +
      '<circle cx="-30" cy="-4" r="5" fill="' + ink + '"/>' +
      '<circle cx="30" cy="-4" r="5" fill="' + ink + '"/>';
  } else if (sigil === "dagger") {
    charge =
      // Points down, pommels gathered under the crown - crossed-blades heraldry
      // rather than a pair of scissors.
      '<g transform="translate(0 18) rotate(155)"><path d="' + daggerPath(150) + '" fill="' +
      accent + '"/></g>' +
      '<g transform="translate(0 18) rotate(205)"><path d="' + daggerPath(150) + '" fill="' +
      darken(accent, 0.18) + '"/></g>' +
      '<path d="' + CROWN_D + '" transform="translate(0 -66) scale(0.64)" fill="' + accent + '"/>';
  } else if (sigil === "chalice") {
    charge =
      '<path d="' + CHALICE_D + '" fill="none" stroke="' + accent + '" stroke-width="3.4"/>' +
      '<path d="' + CHALICE_D + '" fill="' + accent + '" opacity="0.12"/>' +
      '<circle cx="0" cy="-52" r="6" fill="' + accent + '"/>';
  } else {
    charge =
      '<path d="' + sparklePath(0, 0, 66) + '" fill="' + accent + '"/>' +
      '<path d="' + sparklePath(0, 0, 34) + '" fill="' + ink + '" opacity="0.45"/>' +
      '<circle cx="0" cy="0" r="86" fill="none" stroke="' + accent + '" stroke-width="1.2" stroke-dasharray="3 9"/>';
  }

  return (
    '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r * 1.9) + '" fill="' + accent +
    '" opacity="0.1" filter="url(#' + glow + ')"/>' +
    '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r * 0.84) + '" fill="url(#' + ringFill + ')"/>' +
    "<g>" + rays.join("") + "</g>" +
    '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '" fill="none" stroke="' + accent +
    '" stroke-width="2" stroke-opacity="0.85"/>' +
    '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r * 0.94) + '" fill="none" stroke="' + accent +
    '" stroke-width="0.9" stroke-opacity="0.45"/>' +
    '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r * 0.72) + '" fill="none" stroke="' + accent +
    '" stroke-width="1" stroke-opacity="0.3" stroke-dasharray="2 10"/>' +
    "<g>" + ticks.join("") + "</g>" +
    '<g transform="translate(' + n(cx) + ' ' + n(cy) + ') scale(' + n(s) + ')">' + charge + "</g>"
  );
}

/**
 * Hanging pennant with a swallowtail and a shaded fold - carries the kicker in
 * the banner layout and doubles as a chapter marker on carousels.
 */
function pennant(
  d: Defs,
  cx: number,
  top: number,
  w: number,
  h: number,
  fill: string,
  edge: string
): string {
  const half = w / 2;
  const g = linear(
    d,
    [
      [0, lighten(fill, 0.12), 1],
      [0.5, fill, 1],
      [1, darken(fill, 0.3), 1],
    ],
    0,
    0,
    1,
    0
  );
  const d1 =
    "M" + n(cx - half) + " " + n(top) +
    " L" + n(cx + half) + " " + n(top) +
    " L" + n(cx + half) + " " + n(top + h) +
    " L" + n(cx) + " " + n(top + h - w * 0.16) +
    " L" + n(cx - half) + " " + n(top + h) + " Z";
  return (
    '<line x1="' + n(cx - half) + '" y1="' + n(top - 26) + '" x2="' + n(cx + half) + '" y2="' +
    n(top - 26) + '" stroke="' + edge + '" stroke-width="2" stroke-opacity="0.55"/>' +
    '<path d="M' + n(cx - half + 10) + ' ' + n(top - 26) + ' L' + n(cx - half + 10) + ' ' + n(top) +
    '" stroke="' + edge + '" stroke-width="2" stroke-opacity="0.55"/>' +
    '<path d="M' + n(cx + half - 10) + ' ' + n(top - 26) + ' L' + n(cx + half - 10) + ' ' + n(top) +
    '" stroke="' + edge + '" stroke-width="2" stroke-opacity="0.55"/>' +
    '<path d="' + d1 + '" fill="url(#' + g + ')"/>' +
    '<path d="' + d1 + '" fill="none" stroke="' + edge + '" stroke-width="1.4" stroke-opacity="0.7"/>' +
    '<path d="M' + n(cx - half + 14) + ' ' + n(top + 12) + ' L' + n(cx + half - 14) + ' ' + n(top + 12) +
    '" stroke="' + edge + '" stroke-width="1" stroke-opacity="0.45"/>'
  );
}

/** Candle flame with a bloom - the warm anchor of the vigil variants. */
function candle(d: Defs, cx: number, baseY: number, scale: number, warm: string): string {
  const soft = blur(d, 26);
  const core = blur(d, 4);
  const h = 120 * scale;
  return (
    '<circle cx="' + n(cx) + '" cy="' + n(baseY - h * 0.7) + '" r="' + n(150 * scale) + '" fill="' +
    warm + '" opacity="0.22" filter="url(#' + soft + ')"/>' +
    '<rect x="' + n(cx - 15 * scale) + '" y="' + n(baseY - h * 0.42) + '" width="' + n(30 * scale) +
    '" height="' + n(h * 0.42) + '" fill="' + darken(warm, 0.55) + '"/>' +
    '<ellipse cx="' + n(cx) + '" cy="' + n(baseY - h * 0.42) + '" rx="' + n(15 * scale) + '" ry="' +
    n(5 * scale) + '" fill="' + lighten(warm, 0.1) + '" opacity="0.8"/>' +
    '<path d="M' + n(cx) + ' ' + n(baseY - h) + ' C' + n(cx + 15 * scale) + ' ' + n(baseY - h * 0.76) +
    " " + n(cx + 13 * scale) + " " + n(baseY - h * 0.46) + " " + n(cx) + " " + n(baseY - h * 0.44) +
    " C" + n(cx - 13 * scale) + " " + n(baseY - h * 0.46) + " " + n(cx - 15 * scale) + " " +
    n(baseY - h * 0.76) + " " + n(cx) + " " + n(baseY - h) +
    'Z" fill="' + lighten(warm, 0.55) + '" filter="url(#' + core + ')"/>'
  );
}

/* ------------------------------------------------------------------ *
 * Design variants
 * ------------------------------------------------------------------ */

type LayoutId = "skyline" | "emblem" | "split" | "manuscript" | "radial" | "banner";
type Motif = "throne" | "crypt" | "council" | "moonrise" | "tower" | "bloodmoon" | "grove" | "vigil" | "dawn";

interface Look {
  /** Matches the ids in history.ts `designVariants`. */
  id: string;
  layout: LayoutId;
  motif: Motif;
  accent: string;
  sky: [string, string, string];
  ink: string;
  muted: string;
  sigil: Sigil;
  paper: boolean;
}

const C = colors;

/**
 * The twelve variants from history.ts, each bound to one of six layout
 * families. Two or three variants share a family but never a palette or a
 * motif, so ten consecutive posts never repeat a composition.
 */
const LOOKS: Look[] = [
  {
    id: "castle-moonrise",
    layout: "skyline",
    motif: "moonrise",
    accent: C.gold,
    sky: [C.deepSpaceBlue, C.inkBlack, C.twilightIndigo],
    ink: C.champagne,
    muted: C.coolSteel,
    sigil: "crown",
    paper: false,
  },
  {
    id: "twilight-tower",
    layout: "skyline",
    motif: "tower",
    accent: C.coolSteel,
    sky: [C.vintageGrape, C.twilightIndigo, darken(C.inkBlack, 0.35)],
    ink: C.champagne,
    muted: lighten(C.coolSteel, 0.15),
    sigil: "shield",
    paper: false,
  },
  {
    id: "starfield-sigil",
    layout: "emblem",
    motif: "moonrise",
    accent: C.champagne,
    sky: [darken(C.inkBlack, 0.55), C.deepSpaceBlue, darken(C.inkBlack, 0.3)],
    ink: C.champagne,
    muted: C.coolSteel,
    sigil: "star",
    paper: false,
  },
  {
    id: "crown-dagger",
    layout: "emblem",
    motif: "throne",
    accent: C.strawberryRed,
    sky: [darken(C.strawberryRed, 0.8), C.inkBlack, C.twilightIndigo],
    ink: C.champagne,
    muted: C.coolSteel,
    sigil: "dagger",
    paper: false,
  },
  {
    id: "ruby-throne",
    layout: "split",
    motif: "throne",
    accent: C.strawberryRed,
    sky: [darken(C.strawberryRed, 0.72), C.inkBlack, darken(C.strawberryRed, 0.55)],
    ink: C.champagne,
    muted: C.coolSteel,
    sigil: "crown",
    paper: false,
  },
  {
    id: "crypt-reveal",
    layout: "split",
    motif: "crypt",
    accent: C.emerald,
    sky: [darken(C.inkBlack, 0.6), mix(C.inkBlack, C.emerald, 0.14), darken(C.inkBlack, 0.5)],
    ink: C.champagne,
    muted: mix(C.coolSteel, C.emerald, 0.3),
    sigil: "chalice",
    paper: false,
  },
  {
    id: "shadow-council",
    layout: "split",
    motif: "council",
    accent: C.coolSteel,
    sky: [C.inkBlack, darken(C.twilightIndigo, 0.35), darken(C.inkBlack, 0.5)],
    ink: C.champagne,
    muted: C.coolSteel,
    sigil: "shield",
    paper: false,
  },
  {
    id: "gold-manuscript",
    layout: "manuscript",
    motif: "dawn",
    accent: C.gold,
    sky: [C.parchment, mix(C.parchment, C.gold, 0.16), mix(C.parchment, C.gold, 0.3)],
    ink: darken(C.inkBlack, 0.25),
    muted: mix(C.inkBlack, C.parchment, 0.42),
    sigil: "chalice",
    paper: true,
  },
  {
    id: "emerald-forest",
    layout: "radial",
    motif: "grove",
    accent: C.emerald,
    sky: [darken(C.emerald, 0.84), C.inkBlack, mix(C.twilightIndigo, C.emerald, 0.22)],
    ink: C.champagne,
    muted: mix(C.coolSteel, C.emerald, 0.35),
    sigil: "star",
    paper: false,
  },
  {
    id: "blood-moon",
    layout: "radial",
    motif: "bloodmoon",
    accent: C.strawberryRed,
    sky: [darken(C.inkBlack, 0.45), darken(C.strawberryRed, 0.66), darken(C.inkBlack, 0.2)],
    ink: C.champagne,
    muted: C.coolSteel,
    sigil: "dagger",
    paper: false,
  },
  {
    id: "dawn-banner",
    layout: "banner",
    motif: "dawn",
    accent: C.gold,
    sky: [C.twilightIndigo, mix(C.twilightIndigo, C.gold, 0.22), darken(C.inkBlack, 0.15)],
    ink: C.champagne,
    muted: C.coolSteel,
    sigil: "crown",
    paper: false,
  },
  {
    id: "knight-vigil",
    layout: "banner",
    motif: "vigil",
    accent: C.champagne,
    sky: [darken(C.inkBlack, 0.5), C.inkBlack, mix(C.inkBlack, C.gold, 0.16)],
    ink: C.champagne,
    muted: C.coolSteel,
    sigil: "shield",
    paper: false,
  },
];

/**
 * Tracked caps at 22px are a lot of thin strokes; a saturated accent like
 * strawberry-red disappears against its own dark ground at that weight, so the
 * kicker gets a lifted tint while every filled accent shape keeps the true hue.
 */
function kickTone(look: Look): string {
  return look.paper ? mix(look.accent, look.ink, 0.3) : lighten(look.accent, 0.5);
}

/** Variant ids in declaration order - handy for preview sheets. */
export const designVariantIds: string[] = LOOKS.map((l) => l.id);

function lookById(id: string | undefined): Look | undefined {
  return LOOKS.find((l) => l.id === id);
}

/* ------------------------------------------------------------------ *
 * Scene scaffolding
 * ------------------------------------------------------------------ */

interface Copy {
  kicker: string;
  headline: string;
  deck: string;
  cta: string;
}

interface Scene {
  w: number;
  h: number;
  tall: boolean;
  d: Defs;
  rng: Rng;
  look: Look;
  copy: Copy;
  /** Content safe area. */
  m: number;
  top: number;
  bottom: number;
  footRule: number;
}

/**
 * Scales a composition constant by a random factor, but only for free-mode
 * pieces (look.id === "free"). Curated template-mode looks return `base`
 * untouched and consume no extra randomness, so their hand-tuned geometry is
 * pixel-identical to before. Free mode gets real structural variance instead
 * of the same five skeletons just recoloured - moon size and position,
 * skyline height, ring counts and the like differ piece to piece, not only
 * their palette.
 */
function vary(s: Scene, base: number, spread: number): number {
  return s.look.id === "free" ? base * rnd(s.rng, 1 - spread, 1 + spread) : base;
}

function makeScene(w: number, h: number, look: Look, copy: Copy, seed: number): Scene {
  const tall = h > w;
  const footRule = h - (tall ? 190 : 138);
  return {
    w,
    h,
    tall,
    d: new Defs(),
    rng: mulberry32(seed),
    look,
    copy,
    m: tall ? 100 : 92,
    top: tall ? 250 : 150,
    bottom: footRule - 54,
    footRule,
  };
}

/** Base gradient, accent bloom, grain and vignette. */
function ground(s: Scene): string {
  const [a, b, c] = s.look.sky;
  const g = linear(
    s.d,
    [
      [0, a, 1],
      [0.52, b, 1],
      [1, c, 1],
    ],
    0,
    0,
    0.28,
    1
  );
  const bloomY = s.look.paper ? 0.5 : 0.26;
  const bloom = radial(
    s.d,
    [
      [0, s.look.accent, s.look.paper ? 0.12 : 0.2],
      [1, s.look.accent, 0],
    ],
    0.5,
    bloomY,
    0.62
  );
  return (
    '<rect width="' + s.w + '" height="' + s.h + '" fill="url(#' + g + ')"/>' +
    '<rect width="' + s.w + '" height="' + s.h + '" fill="url(#' + bloom + ')"/>'
  );
}

function finish(s: Scene): string {
  return (
    vignette(s.d, s.w, s.h, s.look.paper ? 0.22 : 0.5, s.look.paper ? darken(C.gold, 0.5) : "#000000") +
    grain(s.d, s.w, s.h, s.look.paper ? 0.09 : 0.05)
  );
}

/** Wordmark rule, name and player count. Consistent on every layout. */
function footerBar(s: Scene): string {
  const y = s.footRule;
  const base = y + (s.tall ? 62 : 52);
  const size = s.tall ? 25 : 22;
  const ink = s.look.paper ? s.look.muted : s.look.ink;
  return (
    '<line x1="' + s.m + '" y1="' + y + '" x2="' + (s.w - s.m) + '" y2="' + y + '" stroke="' +
    s.look.accent + '" stroke-opacity="0.45" stroke-width="1"/>' +
    '<path d="M' + (s.w / 2) + ' ' + (y - 6) + ' L' + (s.w / 2 + 7) + ' ' + y + ' L' + (s.w / 2) +
    ' ' + (y + 6) + ' L' + (s.w / 2 - 7) + ' ' + y + ' Z" fill="' + s.look.accent + '"/>' +
    label(s.m, base, "The Resistance Night", size, ink) +
    label(s.w - s.m, base, "5-10 players", size, kickTone(s.look), "end")
  );
}

/* ------------------------------------------------------------------ *
 * Type stack
 * ------------------------------------------------------------------ */

interface StackOpts {
  x: number;
  width: number;
  anchor: Anchor;
  maxHeight: number;
  headSizes: number[];
  headLines: number;
  kickerSize: number;
  deckSize: number;
  deckLines: number;
  ctaSize: number;
  rule: boolean;
  quoteMark?: boolean;
  /** The banner layout prints the kicker inside its pennant instead. */
  hideKicker?: boolean;
}

interface Stack {
  h: number;
  draw: (top: number) => string;
}

/**
 * Four-level hierarchy - tracked caps kicker, display headline, italic deck,
 * caps call to action - laid out from a single top edge so any layout can
 * centre it in whatever band it has left over.
 *
 * The whole stack is rebuilt at successively smaller display sizes until it
 * fits `maxHeight`; nothing is ever allowed to run past its band.
 */
function buildStack(s: Scene, o: StackOpts): Stack {
  const kickH = o.hideKicker ? 0 : o.kickerSize;
  const gapKick = o.hideKicker ? 0 : Math.round(o.kickerSize * 1.5);
  const gapRule = 34;
  const gapDeck = 30;
  const gapCta = 42;

  for (let pass = 0; pass < 5; pass++) {
    const shrink = [1, 0.9, 0.8, 0.7, 0.6][pass];
    const sizes = o.headSizes.map((v) => Math.round(v * shrink));
    const deckLines = Math.max(1, o.deckLines - Math.floor(pass / 2));
    const head = fitText(s.copy.headline, DISPLAY, o.width, o.headLines, sizes, 0.93);
    const deckSize = Math.round(o.deckSize * (pass >= 3 ? 0.86 : 1));
    const deck = s.copy.deck
      ? fitText(s.copy.deck, BODY, o.width, deckLines, [deckSize, deckSize - 4, deckSize - 8], 1.42, true)
      : null;

    let h = kickH + gapKick + head.height;
    if (o.rule) h += gapRule;
    if (deck) h += gapDeck + deck.height;
    if (s.copy.cta) h += gapCta + o.ctaSize;

    if (h <= o.maxHeight || pass === 4) {
      const draw = (top: number) => {
        const out: string[] = [];
        let y = top + kickH;

        if (o.quoteMark) {
          out.push(
            text(
              o.anchor === "middle" ? o.x : o.x - 8,
              y + head.size * 0.5,
              "“",
              {
                family: DISPLAY,
                size: head.size * 2.4,
                fill: s.look.accent,
                opacity: 0.16,
                anchor: o.anchor === "middle" ? "middle" : "start",
              }
            )
          );
        }

        if (!o.hideKicker) {
          out.push(label(o.x, y, s.copy.kicker, o.kickerSize, kickTone(s.look), o.anchor));
        }
        y += gapKick + head.size * 0.74;
        out.push(block(o.x, y, head, { size: head.size, fill: s.look.ink, anchor: o.anchor }));
        y += head.height - head.size * 0.74;

        if (o.rule) {
          y += gapRule;
          const rw = o.anchor === "middle" ? 220 : 150;
          const x1 = o.anchor === "middle" ? o.x - rw / 2 : o.anchor === "end" ? o.x - rw : o.x;
          out.push(
            o.anchor === "middle"
              ? ornamentRule(o.x, y, rw, s.look.accent, 0.9)
              : '<rect x="' + n(x1) + '" y="' + n(y - 2) + '" width="' + rw +
                  '" height="3" fill="' + s.look.accent + '"/>'
          );
        }

        if (deck) {
          y += gapDeck + deck.size * 0.78;
          out.push(
            block(o.x, y, deck, {
              family: BODY,
              size: deck.size,
              fill: s.look.muted,
              anchor: o.anchor,
              italic: true,
            })
          );
          y += deck.height - deck.size * 0.78;
        }

        if (s.copy.cta) {
          y += gapCta + o.ctaSize * 0.5;
          const tw = labelWidth(s.copy.cta, o.ctaSize);
          // The pill has 26px of padding, so a start-anchored button lines its
          // border up with the column edge rather than hanging outside it.
          const cx =
            o.anchor === "middle" ? o.x : o.anchor === "end" ? o.x - tw / 2 - 26 : o.x + tw / 2 + 26;
          out.push(
            '<rect x="' + n(cx - tw / 2 - 26) + '" y="' + n(y - o.ctaSize * 0.95) + '" width="' +
            n(tw + 52) + '" height="' + n(o.ctaSize * 2.1) + '" rx="' + n(o.ctaSize * 1.05) +
            '" fill="none" stroke="' + s.look.accent + '" stroke-opacity="0.6" stroke-width="1.2"/>'
          );
          out.push(
            label(cx, y + o.ctaSize * 0.34, s.copy.cta, o.ctaSize, s.look.ink, "middle")
          );
        }
        return out.join("\n  ");
      };
      return { h, draw };
    }
  }
  return { h: 0, draw: () => "" };
}

/* ------------------------------------------------------------------ *
 * Motif panels
 * ------------------------------------------------------------------ */

/** Pointed arch used by the throne and crypt panels. */
function archPath(cx: number, top: number, w: number, bottom: number): string {
  const half = w / 2;
  return (
    "M" + n(cx - half) + " " + n(bottom) +
    " L" + n(cx - half) + " " + n(top + half * 0.9) +
    " Q" + n(cx - half) + " " + n(top) + " " + n(cx) + " " + n(top) +
    " Q" + n(cx + half) + " " + n(top) + " " + n(cx + half) + " " + n(top + half * 0.9) +
    " L" + n(cx + half) + " " + n(bottom) + " Z"
  );
}

/** Vignette artwork for the split layout, drawn inside `r`. */
function panelArt(s: Scene, r: Region, motif: Motif): string {
  const a = s.look.accent;
  const out: string[] = [];
  const cx = r.x + r.w / 2;
  const soft = blur(s.d, 30);

  const clip = s.d.add(
    (id) =>
      '<clipPath id="' + id + '"><rect x="' + n(r.x) + '" y="' + n(r.y) + '" width="' + n(r.w) +
      '" height="' + n(r.h) + '"/></clipPath>'
  );

  const panelBg = linear(
    s.d,
    [
      [0, darken(s.look.sky[1], 0.45), 1],
      [1, darken(s.look.sky[0], 0.3), 1],
    ],
    0,
    0,
    0.4,
    1
  );
  out.push(
    '<rect x="' + n(r.x) + '" y="' + n(r.y) + '" width="' + n(r.w) + '" height="' + n(r.h) +
    '" fill="url(#' + panelBg + ')"/>'
  );

  if (motif === "throne") {
    // The alcove is the light source; everything in front of it is silhouette.
    const dark = darken(s.look.sky[0], 0.82);
    const archW = r.w * 0.66;
    const archTop = r.y + r.h * 0.16;
    const floor = r.y + r.h * 0.84;
    // Vertical wash: the alcove is brightest at the floor, so the throne in
    // front of it reads as a black cut-out rather than a dark shape on dark.
    const lit = linear(
      s.d,
      [
        [0, darken(a, 0.62), 1],
        [0.42, darken(a, 0.2), 1],
        [1, lighten(a, 0.4), 1],
      ],
      0,
      0,
      0,
      1
    );
    out.push(
      '<rect x="' + n(r.x) + '" y="' + n(r.y) + '" width="' + n(r.w) + '" height="' + n(r.h) +
      '" fill="' + dark + '"/>'
    );
    out.push('<path d="' + archPath(cx, archTop, archW, floor) + '" fill="url(#' + lit + ')"/>');
    // Ribs inside the arch read as stonework and stop it looking like a lamp.
    for (let i = 1; i < 6; i++) {
      const rx = cx - archW / 2 + (archW / 6) * i;
      out.push(
        '<line x1="' + n(rx) + '" y1="' + n(archTop + archW * 0.5) + '" x2="' + n(rx) + '" y2="' +
        n(floor) + '" stroke="' + darken(a, 0.55) + '" stroke-opacity="0.35" stroke-width="1.4"/>'
      );
    }
    out.push(
      '<path d="' + archPath(cx, archTop, archW, floor) + '" fill="none" stroke="' + darken(a, 0.25) +
      '" stroke-opacity="0.9" stroke-width="4"/>'
    );
    out.push(
      '<path d="' + archPath(cx, archTop - 20, archW + 46, floor) + '" fill="none" stroke="' +
      darken(a, 0.5) + '" stroke-opacity="0.5" stroke-width="2"/>'
    );

    // Throne silhouette: high fanned back, arms, dais.
    const seatY = r.y + r.h * 0.74;
    const backTop = r.y + r.h * 0.42;
    const tw = r.w * 0.4;
    out.push(
      '<path d="M' + n(cx - tw / 2) + " " + n(seatY) +
      " L" + n(cx - tw / 2) + " " + n(backTop + r.h * 0.03) +
      " Q" + n(cx - tw * 0.5) + " " + n(backTop - r.h * 0.015) + " " + n(cx - tw * 0.32) + " " + n(backTop - r.h * 0.025) +
      " L" + n(cx) + " " + n(backTop - r.h * 0.05) +
      " L" + n(cx + tw * 0.32) + " " + n(backTop - r.h * 0.025) +
      " Q" + n(cx + tw * 0.5) + " " + n(backTop - r.h * 0.015) + " " + n(cx + tw / 2) + " " + n(backTop + r.h * 0.03) +
      " L" + n(cx + tw / 2) + " " + n(seatY) +
      ' Z" fill="' + dark + '"/>'
    );
    // Arms.
    for (const sgn of [-1, 1]) {
      out.push(
        '<path d="M' + n(cx + sgn * tw * 0.5) + " " + n(seatY - r.h * 0.09) +
        " L" + n(cx + sgn * tw * 0.78) + " " + n(seatY - r.h * 0.09) +
        " L" + n(cx + sgn * tw * 0.78) + " " + n(seatY) +
        " L" + n(cx + sgn * tw * 0.5) + " " + n(seatY) + ' Z" fill="' + dark + '"/>'
      );
    }
    // Dais steps.
    for (let i = 0; i < 3; i++) {
      const sw = tw * (1.7 + i * 0.6);
      out.push(
        '<rect x="' + n(cx - sw / 2) + '" y="' + n(seatY + i * r.h * 0.045) + '" width="' + n(sw) +
        '" height="' + n(r.h * 0.05) + '" fill="' + dark + '"/>'
      );
    }
    out.push(
      '<g transform="translate(' + n(cx) + " " + n(backTop - r.h * 0.11) + ") scale(" +
      n(r.w / 760) + ')"><path d="' + CROWN_D + '" fill="' + lighten(a, 0.45) + '"/></g>'
    );
    // Flanking columns, cropped by the panel.
    for (const px of [r.x + r.w * 0.04, r.x + r.w * 0.96]) {
      out.push(
        '<rect x="' + n(px - 26) + '" y="' + n(r.y) + '" width="52" height="' + n(r.h) + '" fill="' +
        darken(s.look.sky[0], 0.9) + '"/>'
      );
    }
  } else if (motif === "crypt") {
    // One-point perspective: nested arches receding to a lit doorway.
    const glow = radial(s.d, [[0, a, 0.75], [1, a, 0]], 0.5, 0.52, 0.36);
    for (let i = 6; i >= 0; i--) {
      const t = i / 6;
      const aw = r.w * (0.28 + t * 0.72);
      const top = r.y + r.h * (0.46 - t * 0.36);
      out.push(
        '<path d="' + archPath(cx, top, aw, r.y + r.h) + '" fill="' +
        mix(darken(s.look.sky[1], 0.5), a, 0.05 + (1 - t) * 0.12) +
        '" stroke="' + a + '" stroke-opacity="' + n(0.12 + (1 - t) * 0.35) + '" stroke-width="1.6"/>'
      );
    }
    out.push(
      '<rect x="' + n(r.x) + '" y="' + n(r.y) + '" width="' + n(r.w) + '" height="' + n(r.h) +
      '" fill="url(#' + glow + ')"/>'
    );
    // Flagstones converging on the vanishing point, plus receding courses.
    const vpY = r.y + r.h * 0.5;
    const floorY = r.y + r.h;
    // Kept inside the panel: resvg panics on filter/clip geometry when a
    // stroked path runs far outside the canvas, so the fan is clamped.
    for (let i = -5; i <= 5; i++) {
      const t = i / 5;
      out.push(
        '<line x1="' + n(cx + t * r.w * 0.06) + '" y1="' + n(vpY) + '" x2="' +
        n(cx + t * r.w * 0.62) + '" y2="' + n(floorY) + '" stroke="' + a +
        '" stroke-opacity="0.16" stroke-width="1.2"/>'
      );
    }
    for (let i = 1; i <= 5; i++) {
      const y = vpY + Math.pow(i / 5, 2.1) * (floorY - vpY);
      out.push(
        '<line x1="' + n(r.x) + '" y1="' + n(y) + '" x2="' + n(r.x + r.w) + '" y2="' + n(y) +
        '" stroke="' + a + '" stroke-opacity="0.13" stroke-width="1.2"/>'
      );
    }
    // Wall sconces, bracketed to the widest arch.
    out.push(candle(s.d, r.x + r.w * 0.13, r.y + r.h * 0.58, 1, a));
    out.push(candle(s.d, r.x + r.w * 0.87, r.y + r.h * 0.58, 1, a));
  } else if (motif === "council") {
    // Round table seen from a low three-quarter angle, chairs half in shadow.
    const pool = radial(s.d, [[0, a, 0.3], [1, a, 0]], 0.5, 0.3, 0.55);
    out.push(
      '<rect x="' + n(r.x) + '" y="' + n(r.y) + '" width="' + n(r.w) + '" height="' + n(r.h) +
      '" fill="url(#' + pool + ')"/>'
    );
    const ty = r.y + r.h * 0.62;
    const rx = r.w * 0.42;
    const ry = rx * 0.34;
    const figFill = darken(s.look.sky[0], 0.88);

    /** Hooded bust: a head and shoulders is legible at any size, a chair is not. */
    const figure = (fx: number, fy: number, sc: number, op: number) =>
      '<g opacity="' + n(op) + '" fill="' + figFill + '">' +
      '<path d="M' + n(fx - 44 * sc) + " " + n(fy + 34 * sc) +
      " C" + n(fx - 42 * sc) + " " + n(fy - 14 * sc) + " " + n(fx - 17 * sc) + " " + n(fy - 24 * sc) +
      " " + n(fx) + " " + n(fy - 24 * sc) +
      " C" + n(fx + 17 * sc) + " " + n(fy - 24 * sc) + " " + n(fx + 42 * sc) + " " + n(fy - 14 * sc) +
      " " + n(fx + 44 * sc) + " " + n(fy + 34 * sc) + ' Z"/>' +
      '<circle cx="' + n(fx) + '" cy="' + n(fy - 42 * sc) + '" r="' + n(19 * sc) + '"/>' +
      "</g>";

    // Far side of the table: heads and shoulders above the rim.
    const baseSc = Math.min(r.w, r.h) / 470;
    for (let i = 0; i < 5; i++) {
      const ang = Math.PI + ((i + 0.5) / 5) * Math.PI;
      out.push(
        figure(
          cx + Math.cos(ang) * rx * 1.02,
          ty + Math.sin(ang) * ry * 1.02 + 10,
          baseSc * (0.9 + Math.abs(Math.sin(ang)) * 0.2),
          0.95
        )
      );
    }

    // The table itself, then the near-side chairs in front of it.
    out.push(
      '<ellipse cx="' + n(cx) + '" cy="' + n(ty) + '" rx="' + n(rx) + '" ry="' + n(ry) + '" fill="' +
      darken(s.look.sky[1], 0.45) + '" stroke="' + a + '" stroke-opacity="0.6" stroke-width="2"/>'
    );
    out.push(
      '<ellipse cx="' + n(cx) + '" cy="' + n(ty + 12) + '" rx="' + n(rx) + '" ry="' + n(ry) +
      '" fill="' + darken(s.look.sky[0], 0.75) + '"/>'
    );
    out.push(
      '<ellipse cx="' + n(cx) + '" cy="' + n(ty) + '" rx="' + n(rx) + '" ry="' + n(ry) + '" fill="' +
      darken(s.look.sky[1], 0.45) + '" stroke="' + a + '" stroke-opacity="0.6" stroke-width="2"/>'
    );
    out.push(
      '<ellipse cx="' + n(cx) + '" cy="' + n(ty) + '" rx="' + n(rx * 0.66) + '" ry="' + n(ry * 0.66) +
      '" fill="none" stroke="' + a + '" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 10"/>'
    );
    out.push(candle(s.d, cx, ty + 2, 0.72, C.gold));

    // Near side: two large busts, cropped by the panel, that put the viewer
    // at the table rather than looking at it from across the room.
    for (const sgn of [-1, 1]) {
      out.push(
        figure(cx + sgn * rx * 0.92, ty + ry * 2.1 + baseSc * 60, baseSc * 2.2, 1)
      );
    }
    out.push(
      '<ellipse cx="' + n(cx) + '" cy="' + n(r.y + r.h * 0.16) + '" rx="' + n(r.w * 0.34) + '" ry="' +
      n(r.h * 0.09) + '" fill="' + a + '" opacity="0.12" filter="url(#' + soft + ')"/>'
    );
  }

  return '<g clip-path="url(#' + clip + ')">' + out.join("") + "</g>";
}

/** Helmeted bust silhouette for the vigil variant. */
function knightBust(cx: number, baseY: number, scale: number, fill: string, accent: string): string {
  return (
    '<g transform="translate(' + n(cx) + ' ' + n(baseY) + ') scale(' + n(scale) + ')" fill="' + fill + '">' +
    '<path d="M-190 130 C-160 40 -90 8 0 8 C90 8 160 40 190 130 Z"/>' +
    '<path d="M-62 20 L-62 -52 C-62 -110 -36 -140 0 -140 C36 -140 62 -110 62 -52 L62 20 C62 44 34 58 0 58 C-34 58 -62 44 -62 20 Z"/>' +
    '<path d="M0 -140 C-8 -186 6 -212 30 -228 C18 -196 22 -170 8 -142 Z" fill="' + accent + '" opacity="0.75"/>' +
    '<rect x="-46" y="-78" width="92" height="15" fill="' + accent + '" opacity="0.85"/>' +
    '<rect x="-30" y="-28" width="9" height="34" fill="' + accent + '" opacity="0.5"/>' +
    '<rect x="-4" y="-28" width="9" height="34" fill="' + accent + '" opacity="0.5"/>' +
    '<rect x="22" y="-28" width="9" height="34" fill="' + accent + '" opacity="0.5"/>' +
    "</g>"
  );
}

/* ------------------------------------------------------------------ *
 * Layouts
 * ------------------------------------------------------------------ */

function svgDoc(s: Scene, body: string): string {
  // Defs are collected while the body is built, so they are emitted last but
  // written first - resvg resolves references either way, order is for humans.
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + s.w + '" height="' + s.h +
    '" viewBox="0 0 ' + s.w + " " + s.h + '">\n  ' +
    s.d.render() + "\n  " + body + "\n  " + finish(s) + "\n</svg>"
  );
}

/** A single slender watchtower in the foreground. */
function soloTower(s: Scene, x: number, baseY: number, height: number, width: number): string {
  const dark = darken(s.look.sky[1], 0.78);
  const a = s.look.accent;
  const top = baseY - height;
  const glow = blur(s.d, 6);
  const merlons: string[] = [];
  for (let i = 0; i < 5; i++) {
    merlons.push(
      '<rect x="' + n(x - width * 0.62 + i * width * 0.27) + '" y="' + n(top - 18) + '" width="' +
      n(width * 0.16) + '" height="20" fill="' + dark + '"/>'
    );
  }
  return (
    '<path d="M' + n(x - width / 2) + " " + n(baseY) + " L" + n(x - width / 2) + " " + n(top) +
    " L" + n(x + width / 2) + " " + n(top) + " L" + n(x + width / 2) + " " + n(baseY) +
    ' Z" fill="' + dark + '"/>' +
    '<path d="M' + n(x - width * 0.66) + " " + n(top) + " L" + n(x + width * 0.66) + " " + n(top) +
    " L" + n(x + width * 0.58) + " " + n(top - 16) + " L" + n(x - width * 0.58) + " " + n(top - 16) +
    ' Z" fill="' + dark + '"/>' +
    merlons.join("") +
    '<circle cx="' + n(x) + '" cy="' + n(top + height * 0.3) + '" r="' + n(width * 0.5) +
    '" fill="' + a + '" opacity="0.25" filter="url(#' + glow + ')"/>' +
    '<path d="M' + n(x - width * 0.16) + " " + n(top + height * 0.36) + " L" + n(x - width * 0.16) +
    " " + n(top + height * 0.26) + " A" + n(width * 0.16) + " " + n(width * 0.16) + " 0 0 1 " +
    n(x + width * 0.16) + " " + n(top + height * 0.26) + " L" + n(x + width * 0.16) + " " +
    n(top + height * 0.36) + ' Z" fill="' + a + '" opacity="0.9"/>'
  );
}

/**
 * Where a block of height `h` sits inside a vertical band.
 *
 * True centring reads as bottom-heavy on a 1920-tall story: the eye lands high,
 * and Instagram's own reply bar covers the lower strip, so a story block is
 * lifted to ~38% of the slack instead of 50%. Square formats stay centred.
 */
function placeIn(bandTop: number, bandBottom: number, h: number, tall: boolean): number {
  const slack = Math.max(0, bandBottom - bandTop - h);
  return bandTop + slack * (tall ? 0.38 : 0.5);
}

function layoutSkyline(s: Scene): string {
  const horizon = vary(s, s.h - (s.tall ? 700 : 340), 0.08);
  const scale = vary(s, s.tall ? 1.15 : 1, 0.16);
  const out: string[] = [ground(s)];

  out.push(
    starfield(
      s.d,
      s.rng,
      { x: 0, y: 0, w: s.w, h: horizon - 30 },
      Math.round(vary(s, s.tall ? 300 : 210, 0.3)),
      s.look.ink,
      s.look.accent
    )
  );

  // The moon owns the top-right corner; the headline column is narrowed to
  // match so display type never runs into it.
  if (s.look.motif === "moonrise") {
    out.push(
      moon(
        s.d,
        s.rng,
        vary(s, s.w - 178, 0.05),
        vary(s, s.tall ? 300 : 186, 0.12),
        vary(s, 86, 0.15),
        C.champagne,
        C.champagne,
        0.52
      )
    );
  } else {
    out.push(
      moon(
        s.d,
        s.rng,
        vary(s, s.w - 190, 0.05),
        vary(s, s.tall ? 300 : 190, 0.12),
        vary(s, 58, 0.2),
        s.look.muted,
        s.look.accent,
        0
      )
    );
  }

  out.push(fogBands(s.d, s.rng, s.w, horizon - 70, horizon + 90, 7, s.look.muted));
  out.push(battlements(s.d, s.rng, s.w, s.h + 30, horizon, s.look.sky[1], s.look.accent, scale));

  if (s.look.motif === "tower") {
    out.push(
      soloTower(
        s,
        vary(s, s.w * 0.74, 0.06),
        s.h + 20,
        vary(s, s.tall ? 900 : 520, 0.12),
        vary(s, 132, 0.18)
      )
    );
    out.push(fogBands(s.d, s.rng, s.w, horizon + 60, s.h - 120, 5, s.look.muted));
  }

  // Scrim so the footer stays readable over the darkest battlements.
  const scrim = linear(s.d, [[0, "#000000", 0], [1, "#000000", 0.55]], 0, 0, 0, 1);
  out.push(
    '<rect x="0" y="' + n(s.h - 300) + '" width="' + s.w + '" height="300" fill="url(#' + scrim + ')"/>'
  );

  const bandTop = s.top;
  const bandBottom = horizon - (s.tall ? 170 : 130);
  const stack = buildStack(s, {
    x: s.m,
    width: s.w - s.m - 250,
    anchor: "start",
    maxHeight: bandBottom - bandTop,
    headSizes: s.tall ? [124, 112, 100, 88, 78] : [104, 94, 84, 76, 68],
    headLines: 4,
    kickerSize: s.tall ? 26 : 23,
    deckSize: s.tall ? 40 : 33,
    deckLines: 3,
    ctaSize: s.tall ? 24 : 21,
    rule: true,
  });
  // Bottom-aligned: the copy should sit on the skyline, not float in dead sky.
  out.push(stack.draw(Math.max(bandTop, bandBottom - stack.h)));

  out.push(plateFrame(s.w, s.h, s.tall ? 44 : 40, s.look.accent, 0.35));
  out.push(footerBar(s));
  return out.join("\n  ");
}

function layoutEmblem(s: Scene): string {
  const out: string[] = [ground(s)];
  out.push(
    starfield(
      s.d,
      s.rng,
      { x: 0, y: 0, w: s.w, h: s.h },
      Math.round(vary(s, s.tall ? 420 : 300, 0.3)),
      s.look.ink,
      s.look.accent
    )
  );

  const cy = vary(s, s.tall ? s.h * 0.29 : s.h * 0.33, 0.06);
  const r = vary(s, s.tall ? 205 : 168, 0.1);
  // Two or three rings most of the time, one or four occasionally - the
  // curated catalogue always draws exactly three, but free mode does not
  // need to look like the same emblem stamped with different ink.
  const ringCount = s.look.id === "free" ? Math.max(1, Math.min(4, Math.round(vary(s, 3, 0.4)))) : 3;

  // Faint concentric horizon rings behind the device.
  for (let i = 1; i <= ringCount; i++) {
    out.push(
      '<circle cx="' + n(s.w / 2) + '" cy="' + n(cy) + '" r="' + n(r * (1 + i * 0.55)) +
      '" fill="none" stroke="' + s.look.accent + '" stroke-opacity="' + n(0.16 / i) +
      '" stroke-width="1"/>'
    );
  }
  out.push(emblem(s.d, s.rng, s.w / 2, cy, r, s.look.accent, s.look.sky[1], s.look.sigil));

  const bandTop = cy + r * 1.42;
  const stack = buildStack(s, {
    x: s.w / 2,
    width: s.w - s.m * 2 - 60,
    anchor: "middle",
    maxHeight: s.bottom - bandTop,
    headSizes: s.tall ? [112, 100, 90, 80, 70] : [92, 84, 76, 68, 60],
    headLines: 4,
    kickerSize: s.tall ? 26 : 23,
    deckSize: s.tall ? 38 : 31,
    deckLines: 3,
    ctaSize: s.tall ? 24 : 21,
    rule: true,
  });
  out.push(stack.draw(placeIn(bandTop, s.bottom, stack.h, s.tall)));

  out.push(plateFrame(s.w, s.h, s.tall ? 44 : 40, s.look.accent, 0.4));
  // Flourishes stop above the footer rule - they used to sit under the wordmark.
  const fx = s.tall ? 78 : 74;
  out.push(filigreeFrame(fx, fx, s.w - fx * 2, s.footRule - 34 - fx, 72, s.look.accent, 0.5));
  out.push(footerBar(s));
  return out.join("\n  ");
}

function layoutSplit(s: Scene): string {
  const out: string[] = [ground(s)];
  let panel: Region;
  let tx: number;
  let tw: number;
  let bandTop: number;
  let bandBottom: number;

  if (s.tall) {
    panel = { x: 0, y: 0, w: s.w, h: Math.round(vary(s, s.h * 0.45, 0.12)) };
    tx = s.m;
    tw = s.w - s.m * 2;
    bandTop = panel.h + 96;
    bandBottom = s.bottom;
  } else {
    // tx and tw are derived from panel.w (instead of the old hardcoded 496)
    // so the text column and the feathered edge stay in sync as the panel
    // width varies, rather than the gap between them silently changing.
    const panelW = Math.round(vary(s, 424, 0.12));
    panel = { x: 0, y: 0, w: panelW, h: s.h };
    tx = panelW + 72;
    tw = s.w - 92 - tx;
    bandTop = s.top - 40;
    bandBottom = s.bottom;
  }

  out.push(panelArt(s, panel, s.look.motif));

  // Feathered edge between artwork and type so the split is a transition, not a cut.
  if (s.tall) {
    const g = linear(s.d, [[0, "#000000", 0], [1, s.look.sky[1], 1]], 0, 0, 0, 1);
    out.push('<rect x="0" y="' + n(panel.h - 150) + '" width="' + s.w + '" height="152" fill="url(#' + g + ')"/>');
    out.push(
      '<line x1="' + s.m + '" y1="' + n(panel.h) + '" x2="' + (s.w - s.m) + '" y2="' + n(panel.h) +
      '" stroke="' + s.look.accent + '" stroke-opacity="0.55" stroke-width="1.5"/>'
    );
  } else {
    const g = linear(s.d, [[0, "#000000", 0], [1, s.look.sky[1], 1]], 0, 0, 1, 0);
    out.push('<rect x="' + n(panel.w - 130) + '" y="0" width="132" height="' + s.h + '" fill="url(#' + g + ')"/>');
    out.push(
      '<line x1="' + n(panel.w) + '" y1="60" x2="' + n(panel.w) + '" y2="' + n(s.h - 60) +
      '" stroke="' + s.look.accent + '" stroke-opacity="0.55" stroke-width="1.5"/>'
    );
    out.push(
      '<path d="M' + n(panel.w) + ' ' + n(s.h / 2 - 12) + ' L' + n(panel.w + 11) + ' ' + n(s.h / 2) +
      ' L' + n(panel.w) + ' ' + n(s.h / 2 + 12) + ' L' + n(panel.w - 11) + ' ' + n(s.h / 2) +
      ' Z" fill="' + s.look.accent + '"/>'
    );
  }

  const stack = buildStack(s, {
    x: tx,
    width: tw,
    anchor: "start",
    maxHeight: bandBottom - bandTop,
    headSizes: s.tall ? [110, 98, 88, 78, 68] : [78, 70, 63, 56, 50],
    headLines: s.tall ? 4 : 5,
    kickerSize: s.tall ? 25 : 21,
    deckSize: s.tall ? 38 : 28,
    deckLines: 4,
    ctaSize: s.tall ? 24 : 20,
    rule: true,
    quoteMark: true,
  });
  out.push(stack.draw(placeIn(bandTop, bandBottom, stack.h, s.tall)));

  out.push(footerBar(s));
  out.push(plateFrame(s.w, s.h, s.tall ? 44 : 40, s.look.accent, 0.28));
  return out.join("\n  ");
}

function layoutManuscript(s: Scene): string {
  const out: string[] = [ground(s)];
  const a = s.look.accent;
  const soft = blur(s.d, 40);

  // Age the page: uneven tea-coloured blooms and a torn shadow at the edges.
  for (let i = 0; i < 7; i++) {
    out.push(
      '<ellipse cx="' + n(rnd(s.rng, 0, s.w)) + '" cy="' + n(rnd(s.rng, 0, s.h)) + '" rx="' +
      n(rnd(s.rng, 90, 260)) + '" ry="' + n(rnd(s.rng, 70, 200)) + '" fill="' + darken(a, 0.25) +
      '" opacity="' + n(rnd(s.rng, 0.04, 0.1)) + '" filter="url(#' + soft + ')"/>'
    );
  }

  const inset = s.tall ? 64 : 58;
  out.push(
    '<rect x="' + inset + '" y="' + inset + '" width="' + (s.w - inset * 2) + '" height="' +
    (s.h - inset * 2) + '" fill="none" stroke="' + a + '" stroke-width="3" stroke-opacity="0.75"/>'
  );
  out.push(
    '<rect x="' + (inset + 12) + '" y="' + (inset + 12) + '" width="' + (s.w - (inset + 12) * 2) +
    '" height="' + (s.h - (inset + 12) * 2) + '" fill="none" stroke="' + a +
    '" stroke-width="1" stroke-opacity="0.5"/>'
  );
  const fx = inset + 26;
  out.push(filigreeFrame(fx, fx, s.w - fx * 2, s.footRule - 34 - fx, 88, a, 0.8));

  // --- Type: centred kicker, display headline, illuminated deck, CTA -------
  const colW = s.w - s.m * 2 - 90;
  const kickSize = s.tall ? 26 : 23;
  const head = fitText(
    s.copy.headline,
    DISPLAY,
    colW,
    4,
    s.tall ? [118, 106, 94, 84, 74] : [98, 88, 79, 70, 62],
    0.92
  );
  const deckSize = s.tall ? 36 : 30;
  const capSize = deckSize * 2.6;
  const deckText = s.copy.deck.trim();
  const capChar = deckText ? deckText[0].toUpperCase() : "";
  const capW = capChar ? textWidth(capChar, { family: DISPLAY, size: capSize }) + 22 : 0;
  const deck = deckText
    ? fitText(deckText.slice(1), BODY, colW - capW, 4, [deckSize, deckSize - 3, deckSize - 6], 1.5)
    : null;

  let hTotal = kickSize + 54 + head.height + 46;
  if (deck) hTotal += 44 + Math.max(deck.height, capSize * 0.82);
  if (s.copy.cta) hTotal += 56 + kickSize;

  const bandTop = s.top + 10;
  const bandBottom = s.footRule - 70;
  let y = placeIn(bandTop, bandBottom, hTotal, s.tall) + kickSize;

  out.push(label(s.w / 2, y, s.copy.kicker, kickSize, mix(a, s.look.ink, 0.25), "middle"));
  y += 54 + head.size * 0.74;
  out.push(block(s.w / 2, y, head, { size: head.size, fill: s.look.ink, anchor: "middle" }));
  y += head.height - head.size * 0.74 + 46;
  out.push(ornamentRule(s.w / 2, y, 260, a, 0.9));

  if (deck) {
    const left = s.w / 2 - (capW + (colW - capW)) / 2;
    const deckTop = y + 44 + deck.size * 0.8;
    // Illuminated versal in a ruled box, paragraph hangs beside it.
    out.push(
      '<rect x="' + n(left - 4) + '" y="' + n(deckTop - capSize * 0.76) + '" width="' + n(capW - 10) +
      '" height="' + n(capSize * 0.98) + '" fill="' + a + '" opacity="0.14"/>'
    );
    out.push(
      '<rect x="' + n(left - 4) + '" y="' + n(deckTop - capSize * 0.76) + '" width="' + n(capW - 10) +
      '" height="' + n(capSize * 0.98) + '" fill="none" stroke="' + a + '" stroke-width="1.4" stroke-opacity="0.7"/>'
    );
    out.push(
      text(left + (capW - 10) / 2 - 4, deckTop, capChar, {
        size: capSize,
        fill: darken(a, 0.2),
        anchor: "middle",
      })
    );
    out.push(
      block(left + capW, deckTop, deck, { family: BODY, size: deck.size, fill: s.look.muted })
    );
    y = deckTop + Math.max(deck.height, capSize * 0.82) - deck.size * 0.8;
  }

  if (s.copy.cta) {
    y += 56 + kickSize * 0.5;
    out.push(label(s.w / 2, y, s.copy.cta, kickSize, darken(a, 0.15), "middle"));
  }

  // Wax seal, on the centre axis.
  //
  // It used to sit in the bottom-right corner, directly on top of the corner
  // filigree. filigreeFrame only draws corners, so the centre line is the one
  // place guaranteed to be clear - and a centred seal suits this composition,
  // which is centred throughout. Skipped entirely when the copy runs long
  // enough that it would collide with the CTA or the footer rule; a missing
  // seal is a far smaller flaw than an overlapping one.
  const sealR = 44;
  const sealTop = y + 34 + sealR;
  const sealBottom = s.footRule - 40 - sealR;

  if (sealBottom >= sealTop) {
    const sealX = s.w / 2;
    const sealY = (sealTop + sealBottom) / 2;
    out.push(
      '<circle cx="' + n(sealX) + '" cy="' + n(sealY) + '" r="' + sealR + '" fill="' +
      C.strawberryRed + '" opacity="0.85"/>' +
      '<circle cx="' + n(sealX) + '" cy="' + n(sealY) + '" r="36" fill="none" stroke="' +
      darken(C.strawberryRed, 0.4) + '" stroke-width="2"/>' +
      '<g transform="translate(' + n(sealX) + ' ' + n(sealY) + ') scale(0.3)"><path d="' + CROWN_D +
      '" fill="' + lighten(C.strawberryRed, 0.45) + '"/></g>'
    );
  }

  out.push(footerBar(s));
  return out.join("\n  ");
}

function layoutRadial(s: Scene): string {
  const out: string[] = [ground(s)];
  const a = s.look.accent;
  const cy = vary(s, s.tall ? s.h * 0.44 : s.h * 0.45, 0.05);
  const R = Math.min(s.w * 0.43, vary(s, s.tall ? 430 : 372, 0.08));

  out.push(
    starfield(
      s.d,
      s.rng,
      { x: 0, y: 0, w: s.w, h: s.h * 0.8 },
      Math.round(vary(s, s.tall ? 260 : 180, 0.3)),
      s.look.ink,
      a
    )
  );

  if (s.look.motif === "bloodmoon") {
    out.push(
      moon(
        s.d,
        s.rng,
        s.w / 2,
        cy,
        R * 1.02,
        mix(C.strawberryRed, C.champagne, 0.22),
        C.strawberryRed,
        0
      )
    );
    // Knock the disc back just enough for type to sit on it - any more and the
    // blood moon stops being red.
    const scrim = radial(
      s.d,
      [
        [0, "#000000", 0.42],
        [0.62, "#000000", 0.26],
        [1, "#000000", 0],
      ],
      0.5,
      0.5,
      0.5
    );
    out.push(
      '<circle cx="' + n(s.w / 2) + '" cy="' + n(cy) + '" r="' + n(R * 1.3) + '" fill="url(#' + scrim + ')"/>'
    );
  } else {
    // Enchanted grove: a lit clearing ringed by trunks and runes.
    const glow = radial(s.d, [[0, a, 0.34], [0.6, a, 0.1], [1, a, 0]], 0.5, 0.5, 0.5);
    out.push(
      '<circle cx="' + n(s.w / 2) + '" cy="' + n(cy) + '" r="' + n(R * 1.5) + '" fill="url(#' + glow + ')"/>'
    );
    // Trunks are kept to the outer thirds so they frame the ring instead of
    // striping across the type, and each one leans and branches.
    const trunkFill = darken(s.look.sky[0], 0.6);
    const trunkCount = s.look.id === "free" ? rint(s.rng, 8, 13) : 10;
    for (let i = 0; i < trunkCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const tx = s.w / 2 + side * rnd(s.rng, R * 0.98, s.w * 0.56);
      const tw = rnd(s.rng, 22, 54);
      const topY = rnd(s.rng, -60, s.h * 0.18);
      const lean = rnd(s.rng, -34, 34);
      const op = n(rnd(s.rng, 0.45, 0.95));
      out.push(
        '<path d="M' + n(tx - tw / 2) + " " + n(s.h) +
        " C" + n(tx - tw * 0.4 + lean * 0.5) + " " + n(s.h * 0.55) + " " +
        n(tx - tw * 0.24 + lean) + " " + n(s.h * 0.3) + " " + n(tx - tw * 0.2 + lean) + " " + n(topY) +
        " L" + n(tx + tw * 0.2 + lean) + " " + n(topY) +
        " C" + n(tx + tw * 0.24 + lean) + " " + n(s.h * 0.3) + " " +
        n(tx + tw * 0.4 + lean * 0.5) + " " + n(s.h * 0.55) + " " + n(tx + tw / 2) + " " + n(s.h) +
        ' Z" fill="' + trunkFill + '" opacity="' + op + '"/>'
      );
      // A couple of boughs reaching toward the clearing.
      for (let b = 0; b < 2; b++) {
        const by = rnd(s.rng, s.h * 0.16, s.h * 0.55);
        const bx = tx + lean * 0.6;
        out.push(
          '<path d="M' + n(bx) + " " + n(by) + " Q" + n(bx - side * 70) + " " + n(by - 44) + " " +
          n(bx - side * 150) + " " + n(by - 30) + '" fill="none" stroke="' + trunkFill +
          '" stroke-width="' + n(rnd(s.rng, 5, 12)) + '" stroke-linecap="round" opacity="' + op + '"/>'
        );
      }
    }
    out.push(fogBands(s.d, s.rng, s.w, cy + R * 0.5, s.h - 140, 6, a));
  }

  // Radiating ticks - the "radial" signature.
  const ticks: string[] = [];
  const tickCount = s.look.id === "free" ? rint(s.rng, 48, 72) : 60;
  for (let i = 0; i < tickCount; i++) {
    const ang = (i / tickCount) * Math.PI * 2;
    const long = i % 5 === 0;
    const r1 = R * 1.06;
    const r2 = R * (long ? 1.3 : 1.16);
    ticks.push(
      '<line x1="' + n(s.w / 2 + Math.cos(ang) * r1) + '" y1="' + n(cy + Math.sin(ang) * r1) +
      '" x2="' + n(s.w / 2 + Math.cos(ang) * r2) + '" y2="' + n(cy + Math.sin(ang) * r2) +
      '" stroke="' + a + '" stroke-opacity="' + (long ? "0.6" : "0.25") + '" stroke-width="' +
      (long ? "2" : "1") + '"/>'
    );
  }
  out.push("<g>" + ticks.join("") + "</g>");
  out.push(
    '<circle cx="' + n(s.w / 2) + '" cy="' + n(cy) + '" r="' + n(R) + '" fill="none" stroke="' + a +
    '" stroke-width="2" stroke-opacity="0.8"/>'
  );
  out.push(
    '<circle cx="' + n(s.w / 2) + '" cy="' + n(cy) + '" r="' + n(R * 0.93) + '" fill="none" stroke="' +
    a + '" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="3 11"/>'
  );

  const stack = buildStack(s, {
    x: s.w / 2,
    width: R * 1.5,
    anchor: "middle",
    maxHeight: R * 1.62,
    headSizes: s.tall ? [100, 90, 80, 72, 64] : [84, 76, 68, 61, 54],
    headLines: 4,
    kickerSize: s.tall ? 25 : 22,
    deckSize: s.tall ? 34 : 28,
    deckLines: 3,
    ctaSize: s.tall ? 23 : 20,
    rule: true,
  });
  out.push(stack.draw(cy - stack.h / 2));

  if (s.look.motif === "bloodmoon") {
    out.push(battlements(s.d, s.rng, s.w, s.h + 20, s.h - (s.tall ? 180 : 140), s.look.sky[1], a, 0.55));
  } else {
    // Forest floor: a soft ridge rather than masonry.
    out.push(
      '<path d="M-20 ' + n(s.h + 20) + ' L-20 ' + n(s.h - 150) + ' Q' + n(s.w * 0.3) + " " +
      n(s.h - 210) + " " + n(s.w * 0.55) + " " + n(s.h - 160) + " T" + n(s.w + 20) + " " +
      n(s.h - 190) + " L" + n(s.w + 20) + " " + n(s.h + 20) + ' Z" fill="' +
      darken(s.look.sky[0], 0.72) + '"/>'
    );
  }
  const scrim2 = linear(s.d, [[0, "#000000", 0], [1, "#000000", 0.5]], 0, 0, 0, 1);
  out.push('<rect x="0" y="' + n(s.h - 260) + '" width="' + s.w + '" height="260" fill="url(#' + scrim2 + ')"/>');

  out.push(plateFrame(s.w, s.h, s.tall ? 44 : 40, a, 0.32));
  out.push(footerBar(s));
  return out.join("\n  ");
}

function layoutBanner(s: Scene): string {
  const out: string[] = [ground(s)];
  const a = s.look.accent;

  if (s.look.motif === "dawn") {
    const hz = vary(s, s.h - (s.tall ? 430 : 300), 0.06);
    out.push(
      starfield(
        s.d,
        s.rng,
        { x: 0, y: 0, w: s.w, h: hz * 0.7 },
        Math.round(vary(s, s.tall ? 200 : 140, 0.3)),
        s.look.ink,
        a
      )
    );
    const sun = radial(s.d, [[0, lighten(a, 0.4), 0.55], [0.45, a, 0.2], [1, a, 0]], 0.5, 1, 0.62);
    out.push('<rect x="0" y="' + n(hz - 420) + '" width="' + s.w + '" height="440" fill="url(#' + sun + ')"/>');
    out.push(lightShafts(s.d, s.rng, s.w / 2, hz, 0.42, -hz + 40, a, 7));
    out.push(fogBands(s.d, s.rng, s.w, hz - 60, hz + 60, 5, lighten(a, 0.3)));
    out.push(battlements(s.d, s.rng, s.w, s.h + 20, hz, s.look.sky[1], a, vary(s, s.tall ? 1.05 : 0.9, 0.14)));
  } else {
    out.push(
      starfield(
        s.d,
        s.rng,
        { x: 0, y: 0, w: s.w, h: s.h * 0.55 },
        Math.round(vary(s, s.tall ? 180 : 130, 0.3)),
        s.look.ink,
        a
      )
    );
    const warm = radial(s.d, [[0, C.gold, 0.35], [1, C.gold, 0]], 0.5, 0.86, 0.6);
    out.push('<rect width="' + s.w + '" height="' + s.h + '" fill="url(#' + warm + ')"/>');
    out.push(
      knightBust(
        s.w / 2,
        s.h - (s.tall ? 60 : 40),
        vary(s, s.tall ? 1.9 : 1.45, 0.1),
        darken(s.look.sky[1], 0.72),
        a
      )
    );
    out.push(candle(s.d, s.m + 40, s.h - (s.tall ? 250 : 170), s.tall ? 1.25 : 1, C.gold));
    out.push(candle(s.d, s.w - s.m - 40, s.h - (s.tall ? 290 : 200), s.tall ? 1.05 : 0.85, C.gold));
    out.push(fogBands(s.d, s.rng, s.w, s.h * 0.6, s.h - 120, 5, s.look.muted));
  }

  const scrim = linear(s.d, [[0, "#000000", 0], [1, "#000000", 0.5]], 0, 0, 0, 1);
  out.push('<rect x="0" y="' + n(s.h - 280) + '" width="' + s.w + '" height="280" fill="url(#' + scrim + ')"/>');

  // Pennant carries the kicker. Width stays sized to the actual text
  // (min/max clamp around labelWidth) rather than varying, so the kicker
  // never clips; height and position vary instead.
  const pw = Math.min(400, Math.max(280, labelWidth(s.copy.kicker, s.tall ? 26 : 23) + 96));
  const pTop = vary(s, s.tall ? 156 : 100, 0.15);
  const ph = vary(s, s.tall ? 190 : 158, 0.1);
  out.push(pennant(s.d, s.w / 2, pTop, pw, ph, darken(a, 0.42), a));
  out.push(
    label(s.w / 2, pTop + ph * 0.54, s.copy.kicker, s.tall ? 26 : 23, lighten(a, 0.8), "middle")
  );

  const bandTop = pTop + ph + (s.tall ? 130 : 74);
  const bandBottom = s.bottom - (s.look.motif === "vigil" ? (s.tall ? 420 : 250) : s.tall ? 210 : 130);
  const stack = buildStack(s, {
    x: s.w / 2,
    width: s.w - s.m * 2 - 40,
    anchor: "middle",
    maxHeight: bandBottom - bandTop,
    headSizes: s.tall ? [126, 112, 100, 88, 78] : [100, 90, 81, 72, 64],
    headLines: 4,
    kickerSize: s.tall ? 26 : 23,
    deckSize: s.tall ? 38 : 30,
    deckLines: 3,
    ctaSize: s.tall ? 24 : 21,
    rule: true,
    hideKicker: true,
  });
  out.push(stack.draw(placeIn(bandTop, bandBottom, stack.h, s.tall)));

  out.push(plateFrame(s.w, s.h, s.tall ? 44 : 40, a, 0.34));
  out.push(footerBar(s));
  return out.join("\n  ");
}

const LAYOUTS: Record<LayoutId, (s: Scene) => string> = {
  skyline: layoutSkyline,
  emblem: layoutEmblem,
  split: layoutSplit,
  manuscript: layoutManuscript,
  radial: layoutRadial,
  banner: layoutBanner,
};

function renderCard(w: number, h: number, look: Look, copy: Copy, seed: number): string {
  const s = makeScene(w, h, look, copy, seed);
  const body = LAYOUTS[look.layout](s);
  return svgDoc(s, body);
}

/* ------------------------------------------------------------------ *
 * Copy extraction
 * ------------------------------------------------------------------ */

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

function ctaFor(item: ContentItem): string {
  switch (item.type) {
    case "reel":
      return "watch the round";
    case "carousel":
      return "swipe on";
    case "story":
      return "tap to play";
    default:
      return "link in bio";
  }
}

/**
 * Splits a blob of copy into a headline and a supporting deck line.
 *
 * Tags and em dashes are removed here as well as at generation time, so items
 * created before those rules existed still typeset correctly.
 */
function splitCopy(raw: string): { headline: string; deck: string } {
  const blob = stripHashtags(stripEmDashes(raw));
  const lines = blob
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { headline: "", deck: "" };
  if (lines.length > 1) return { headline: lines[0], deck: lines.slice(1).join(" ") };

  // One long line: break it at the first sentence boundary so the card still
  // gets two type levels instead of one wall of display serif.
  const only = lines[0];
  if (only.length > 90) {
    const m = only.match(/^(.{25,110}?[.!?—–-])\s+(.+)$/);
    if (m) return { headline: m[1].replace(/[—–-]$/, "").trim(), deck: m[2].trim() };
  }
  return { headline: only, deck: "" };
}

/* ------------------------------------------------------------------ *
 * Freedom mode
 *
 * The twelve looks above are fixed templates. Freedom throws the template
 * away: eight unrelated art directions (eclipse, shattered glass, round-table
 * constellation, tarot card, typographic poster, trust/betray rift, sonar,
 * wax seal) crossed with eight palettes, every parameter drawn from a seeded
 * random source. Same seed, same picture; a new seed is a new composition.
 * ------------------------------------------------------------------ */

interface Palette {
  accent: string;
  sky: [string, string, string];
  ink: string;
  muted: string;
  paper: boolean;
  sigil: Sigil;
  /** The danger colour - traitor nodes, wax, cracks. */
  hot: string;
}

const PALETTES: Palette[] = [
  { accent: C.gold, sky: [C.deepSpaceBlue, C.inkBlack, C.twilightIndigo], ink: C.champagne, muted: C.coolSteel, paper: false, sigil: "crown", hot: C.strawberryRed },
  { accent: C.strawberryRed, sky: [darken(C.strawberryRed, 0.82), C.inkBlack, darken(C.strawberryRed, 0.62)], ink: C.champagne, muted: C.coolSteel, paper: false, sigil: "dagger", hot: C.gold },
  { accent: C.emerald, sky: [darken(C.emerald, 0.85), C.inkBlack, mix(C.twilightIndigo, C.emerald, 0.2)], ink: C.champagne, muted: mix(C.coolSteel, C.emerald, 0.35), paper: false, sigil: "chalice", hot: C.gold },
  { accent: lighten(C.coolSteel, 0.2), sky: [C.vintageGrape, C.twilightIndigo, C.deepSpaceBlue], ink: C.champagne, muted: C.coolSteel, paper: false, sigil: "shield", hot: C.strawberryRed },
  { accent: C.gold, sky: [C.parchment, mix(C.parchment, C.gold, 0.16), mix(C.parchment, C.gold, 0.32)], ink: darken(C.inkBlack, 0.25), muted: mix(C.inkBlack, C.parchment, 0.42), paper: true, sigil: "star", hot: C.strawberryRed },
  { accent: mix(C.gold, C.strawberryRed, 0.5), sky: [darken(C.strawberryRed, 0.88), darken(C.inkBlack, 0.4), mix(C.inkBlack, C.gold, 0.2)], ink: C.champagne, muted: C.coolSteel, paper: false, sigil: "dagger", hot: C.gold },
  { accent: C.champagne, sky: [darken(C.inkBlack, 0.6), darken(C.inkBlack, 0.3), C.deepSpaceBlue], ink: C.champagne, muted: C.coolSteel, paper: false, sigil: "star", hot: C.strawberryRed },
  { accent: mix(C.emerald, C.gold, 0.5), sky: [C.inkBlack, darken(C.deepSpaceBlue, 0.2), mix(C.inkBlack, C.emerald, 0.16)], ink: C.champagne, muted: C.coolSteel, paper: false, sigil: "crown", hot: C.strawberryRed },
];

type Direction = (s: Scene, p: Palette) => string;

function stackOpts(s: Scene, over: Partial<StackOpts>): StackOpts {
  return {
    x: s.w / 2,
    width: s.w - s.m * 2,
    anchor: "middle",
    maxHeight: 300,
    headSizes: s.tall ? [128, 112, 96, 82, 70] : [104, 92, 80, 68, 58],
    headLines: 4,
    kickerSize: s.tall ? 26 : 22,
    deckSize: s.tall ? 34 : 29,
    deckLines: 3,
    ctaSize: s.tall ? 24 : 21,
    rule: true,
    ...over,
  };
}

/** Darkens the lower part of the frame so type stays legible over busy art. */
function scrim(s: Scene, y0: number, strength = 0.82): string {
  const g = linear(s.d, [[0, s.look.sky[0], 0], [0.4, s.look.sky[0], strength], [1, s.look.sky[0], strength]], 0, 0, 0, 1);
  return '<rect x="0" y="' + n(y0) + '" width="' + s.w + '" height="' + n(s.h - y0) + '" fill="url(#' + g + ')"/>';
}

const polar = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];

/** 1 - a total eclipse with a corona, orbit rings and rays. */
const dirEclipse: Direction = (s) => {
  const { w, rng, d, look } = s;
  const a = look.accent;
  const r = (s.tall ? w * 0.25 : w * 0.132) * rnd(rng, 0.94, 1.08);
  const cx = w / 2 + rnd(rng, -80, 80);
  const cy = s.top + r * 1.2 + (s.tall ? 30 : 0);
  const out: string[] = [ground(s)];
  out.push(starfield(d, rng, { x: 0, y: 0, w, h: s.footRule }, s.tall ? 280 : 190, look.ink, a));
  out.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r * 1.7) + '" fill="' + a + '" opacity="0.32" filter="url(#' + blur(d, 46) + ')"/>');
  const rays = rint(rng, 52, 90);
  const rayLines: string[] = [];
  for (let i = 0; i < rays; i++) {
    const ang = (i / rays) * Math.PI * 2 + rnd(rng, -0.03, 0.03);
    const [x1, y1] = polar(cx, cy, r * 1.06, ang);
    const [x2, y2] = polar(cx, cy, r * (1.14 + Math.pow(rng(), 2.2) * 1.15), ang);
    rayLines.push('<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '" stroke="' + lighten(a, 0.3) + '" stroke-opacity="' + n(rnd(rng, 0.12, 0.6)) + '" stroke-width="' + n(rnd(rng, 1, 3.2)) + '"/>');
  }
  out.push(rayLines.join(""));
  for (let i = 0; i < 3; i++) {
    const rx = r * (1.55 + i * 0.4);
    out.push('<ellipse cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(rx) + '" ry="' + n(rx * 0.26) + '" fill="none" stroke="' + look.ink + '" stroke-opacity="0.32" stroke-dasharray="2 10" stroke-width="2" transform="rotate(' + n(rnd(rng, -28, 28)) + " " + n(cx) + " " + n(cy) + ')"/>');
  }
  out.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r + 7) + '" fill="' + lighten(a, 0.45) + '"/>');
  out.push('<circle cx="' + n(cx + r * 0.07) + '" cy="' + n(cy + r * 0.05) + '" r="' + n(r) + '" fill="' + darken(look.sky[0], 0.45) + '"/>');
  const artBottom = cy + r * 1.75;
  out.push(scrim(s, artBottom - 70, 0.78));
  const stack = buildStack(s, stackOpts(s, { maxHeight: s.bottom - artBottom }));
  out.push(stack.draw(artBottom + Math.max(0, (s.bottom - artBottom - stack.h) / 2)));
  out.push(footerBar(s));
  return out.join("\n  ");
};

/** 2 - light breaking through shattered glass, type on a slanted slab. */
const dirShards: Direction = (s, p) => {
  const { w, h, rng, look } = s;
  const a = look.accent;
  const cols = rint(rng, 5, 7);
  const rows = Math.max(4, Math.round((cols * h) / w));
  const cw = w / cols;
  const ch = h / rows;
  const pts: [number, number][][] = [];
  for (let j = 0; j <= rows; j++) {
    const row: [number, number][] = [];
    for (let i = 0; i <= cols; i++) {
      const jx = i === 0 || i === cols ? 0 : rnd(rng, -0.38, 0.38) * cw;
      const jy = j === 0 || j === rows ? 0 : rnd(rng, -0.38, 0.38) * ch;
      row.push([i * cw + jx, j * ch + jy]);
    }
    pts.push(row);
  }
  const fx = rnd(rng, w * 0.2, w * 0.8);
  const fy = rnd(rng, h * 0.1, h * 0.32);
  const maxD = Math.hypot(w, h * 0.8);
  const tri = (A: [number, number], B: [number, number], Cc: [number, number]) => {
    const mx = (A[0] + B[0] + Cc[0]) / 3;
    const my = (A[1] + B[1] + Cc[1]) / 3;
    const t = Math.max(0, Math.min(1, Math.pow(Math.min(1, Math.hypot(mx - fx, my - fy) / maxD), 0.7) + rnd(rng, -0.12, 0.12)));
    let fill = mix(look.paper ? lighten(a, 0.45) : mix(a, p.hot, 0.25), look.sky[2], Math.pow(t, 0.9));
    if (rng() > 0.86) fill = p.hot;
    else if (rng() > 0.8) fill = darken(look.sky[0], 0.2);
    return '<path d="M' + n(A[0]) + " " + n(A[1]) + " L" + n(B[0]) + " " + n(B[1]) + " L" + n(Cc[0]) + " " + n(Cc[1]) + ' Z" fill="' + fill + '" fill-opacity="' + n(rnd(rng, 0.55, 1)) + '" stroke="' + look.ink + '" stroke-opacity="0.12" stroke-width="1.2"/>';
  };
  const out: string[] = ['<rect width="' + w + '" height="' + h + '" fill="' + look.sky[1] + '"/>'];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const A = pts[j][i], B = pts[j][i + 1], D = pts[j + 1][i], E = pts[j + 1][i + 1];
      if (rng() > 0.5) { out.push(tri(A, B, D)); out.push(tri(B, E, D)); }
      else { out.push(tri(A, B, E)); out.push(tri(A, E, D)); }
    }
  }
  out.push('<circle cx="' + n(fx) + '" cy="' + n(fy) + '" r="' + n(w * 0.22) + '" fill="' + lighten(a, 0.6) + '" opacity="0.45" filter="url(#' + blur(s.d, 50) + ')"/>');
  const slabTop = s.tall ? h * 0.52 : h * 0.47;
  const l = slabTop + rnd(rng, 40, 90);
  const rr = slabTop - rnd(rng, 0, 40);
  const slab = look.paper ? look.sky[0] : darken(look.sky[0], 0.3);
  out.push('<path d="M0 ' + n(l) + " L" + w + " " + n(rr) + " L" + w + " " + h + " L0 " + h + ' Z" fill="' + slab + '" fill-opacity="0.94"/>');
  out.push('<path d="M0 ' + n(l) + " L" + w + " " + n(rr) + '" stroke="' + a + '" stroke-width="4" fill="none"/>');
  const top = l + 56;
  const stack = buildStack(s, stackOpts(s, { x: s.m, anchor: "start", maxHeight: s.footRule - 28 - top }));
  out.push(stack.draw(top));
  out.push(footerBar(s));
  return out.join("\n  ");
};

/** 3 - the round table: players as stars, one of them a traitor. */
const dirConstellation: Direction = (s, p) => {
  const { w, rng, d, look } = s;
  const a = look.accent;
  const R = s.tall ? 320 : 196;
  const cx = w / 2;
  const cy = s.top + R + 4;
  const out: string[] = [ground(s)];
  out.push(starfield(d, rng, { x: 0, y: 0, w, h: s.footRule }, s.tall ? 300 : 200, look.ink, a));
  const count = rint(rng, 5, 10);
  const offset = rnd(rng, 0, Math.PI * 2);
  const traitor = rint(rng, 0, count - 1);
  const nodes: [number, number][] = [];
  for (let i = 0; i < count; i++) nodes.push(polar(cx, cy, R * rnd(rng, 0.94, 1.06), offset + (i / count) * Math.PI * 2));
  out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + n(R) + '" fill="none" stroke="' + a + '" stroke-opacity="0.28" stroke-dasharray="3 9"/>');
  out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + n(R * 0.62) + '" fill="none" stroke="' + a + '" stroke-opacity="0.16"/>');
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    for (const k of [1, 2]) {
      const B = nodes[(i + k) % count];
      const isT = i === traitor || (i + k) % count === traitor;
      const red = isT && k === 2;
      lines.push('<line x1="' + n(nodes[i][0]) + '" y1="' + n(nodes[i][1]) + '" x2="' + n(B[0]) + '" y2="' + n(B[1]) + '" stroke="' + (red ? p.hot : a) + '" stroke-opacity="' + (red ? 0.7 : 0.3) + '" stroke-width="' + (red ? 2.2 : 1.2) + '"/>');
    }
  }
  out.push(lines.join(""));
  const halo = blur(d, 9);
  nodes.forEach(([x, y], i) => {
    const bad = i === traitor;
    const col = bad ? p.hot : look.ink;
    out.push('<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + (bad ? 30 : 22) + '" fill="' + col + '" opacity="0.4" filter="url(#' + halo + ')"/>');
    out.push('<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + (bad ? 12 : 9) + '" fill="' + col + '"/>');
    out.push('<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + (bad ? 22 : 17) + '" fill="none" stroke="' + col + '" stroke-opacity="0.7"/>');
  });
  out.push(emblem(d, rng, cx, cy, R * 0.36, a, look.ink, look.sigil));
  const artBottom = cy + R + 36;
  const stack = buildStack(s, stackOpts(s, { maxHeight: s.bottom - artBottom }));
  out.push(stack.draw(artBottom + Math.max(0, (s.bottom - artBottom - stack.h) / 2)));
  out.push(footerBar(s));
  return out.join("\n  ");
};

/** 4 - a tarot card for the night, with the copy set beside or beneath it. */
const dirTarot: Direction = (s) => {
  const { w, rng, d, look } = s;
  const a = look.accent;
  const out: string[] = [ground(s)];
  const lat: string[] = [];
  const step = 90;
  for (let k = -s.h; k < w + s.h; k += step) {
    lat.push('<line x1="' + k + '" y1="0" x2="' + (k + s.h) + '" y2="' + s.h + '"/>');
    lat.push('<line x1="' + k + '" y1="' + s.h + '" x2="' + (k + s.h) + '" y2="0"/>');
  }
  out.push('<g stroke="' + a + '" stroke-opacity="0.07" stroke-width="1">' + lat.join("") + "</g>");
  const cw = s.tall ? 700 : 420;
  const chh = s.tall ? 940 : s.footRule - 40 - (s.top - 20);
  const x = s.tall ? (w - cw) / 2 : s.m;
  const y = s.top - 20;
  const bg = linear(d, [[0, look.sky[2], 1], [1, look.sky[0], 1]], 0, 0, 0, 1);
  out.push('<rect x="' + x + '" y="' + y + '" width="' + cw + '" height="' + chh + '" rx="8" fill="url(#' + bg + ')" stroke="' + a + '" stroke-width="3"/>');
  out.push('<rect x="' + (x + 16) + '" y="' + (y + 16) + '" width="' + (cw - 32) + '" height="' + (chh - 32) + '" rx="4" fill="none" stroke="' + a + '" stroke-opacity="0.6"/>');
  out.push(filigreeFrame(x + 22, y + 22, cw - 44, chh - 44, s.tall ? 70 : 52, a, 0.7));
  out.push(label(x + cw / 2, y + 74, ROMAN[rint(rng, 0, 9)], s.tall ? 30 : 24, kickTone(look), "middle"));
  const archTop = y + 104;
  const archBottom = y + chh - 120;
  const archW = cw * 0.66;
  out.push('<path d="' + archPath(x + cw / 2, archTop, archW, archBottom) + '" fill="' + darken(look.sky[0], 0.3) + '" stroke="' + a + '" stroke-width="2"/>');
  out.push(starfield(d, rng, { x: x + cw / 2 - archW / 2 + 10, y: archTop + 40, w: archW - 20, h: archBottom - archTop - 50 }, 70, look.ink, a));
  out.push(emblem(d, rng, x + cw / 2, (archTop + archBottom) / 2 + 20, archW * 0.3, a, look.ink, look.sigil));
  const names = ["the traitor", "the seer", "the oath", "the knife", "the table", "the last vote"];
  out.push(label(x + cw / 2, y + chh - 62, names[rint(rng, 0, names.length - 1)], s.tall ? 26 : 20, look.ink, "middle"));
  if (s.tall) {
    const top = y + chh + 56;
    const stack = buildStack(s, stackOpts(s, { maxHeight: s.bottom - top }));
    out.push(stack.draw(top));
  } else {
    const sx = x + cw + 60;
    const stack = buildStack(s, stackOpts(s, { x: sx, anchor: "start", width: w - s.m - sx, headSizes: [86, 74, 64, 56, 48], headLines: 6, maxHeight: chh }));
    out.push(stack.draw(y + Math.max(0, (chh - stack.h) / 2)));
  }
  out.push(footerBar(s));
  return out.join("\n  ");
};

/** 5 - typographic poster: the headline is the artwork. */
const dirType: Direction = (s, p) => {
  const { w, h, rng, d, look } = s;
  const a = look.accent;
  const out: string[] = [ground(s)];
  const bigR = w * rnd(rng, 0.42, 0.6);
  out.push('<circle cx="' + n(rnd(rng, w * 0.55, w * 0.95)) + '" cy="' + n(rnd(rng, h * 0.2, h * 0.5)) + '" r="' + n(bigR) + '" fill="' + (rng() > 0.5 ? a : p.hot) + '" opacity="0.2" filter="url(#' + blur(d, 30) + ')"/>');
  out.push('<rect x="' + s.m + '" y="' + (s.top - 56) + '" width="' + (w - s.m * 2) + '" height="6" fill="' + a + '"/>');
  out.push(label(s.m, s.top - 16, s.copy.kicker, s.tall ? 26 : 22, kickTone(look)));
  const side = ["trust no one", "lie well", "one of you is lying", "vote carefully"][rint(rng, 0, 3)];
  out.push('<g transform="rotate(90 ' + (w - 44) + " " + (s.top + 20) + ')">' + label(w - 44, s.top + 20, side, 20, look.muted) + "</g>");
  const deckMax = s.copy.deck ? (s.tall ? 230 : 190) : 90;
  const maxH = s.bottom - (s.top + 20) - deckMax;
  const width = w - s.m * 2 - 36;
  const sizes = s.tall ? [300, 260, 224, 192, 164, 140, 118, 96] : [250, 216, 186, 160, 136, 116, 96, 80];
  let fit = fitText(s.copy.headline, DISPLAY, width, 8, sizes, 0.9, true);
  for (const size of sizes) {
    const f = fitText(s.copy.headline, DISPLAY, width, 8, [size], 0.9, true);
    if (f.height <= maxH) { fit = f; break; }
  }
  let y = s.top + 20 + fit.size * 0.78;
  fit.lines.forEach((line, i) => {
    const solid = i % 2 === 0;
    let t = text(s.m, y, line, { size: fit.size, fill: solid ? look.ink : a, italic: true });
    if (!solid) t = t.replace('fill="' + a + '"', 'fill="none" stroke="' + a + '" stroke-width="2.6"');
    out.push(t);
    y += fit.lead;
  });
  let yy = Math.max(y - fit.lead + 64, s.bottom - deckMax + 30);
  if (s.copy.deck) {
    const deck = fitText(s.copy.deck, BODY, s.tall ? 640 : 560, 3, [s.tall ? 34 : 29, 26, 23], 1.42, true);
    out.push(block(s.m, yy, deck, { family: BODY, size: deck.size, fill: look.muted, italic: true }));
    yy += deck.height + 20;
  }
  if (s.copy.cta) out.push(label(s.m, Math.min(yy + 24, s.bottom + 10), s.copy.cta, s.tall ? 24 : 21, look.ink));
  out.push(footerBar(s));
  return out.join("\n  ");
};

/** 6 - trust on one side, betrayal on the other, a crack down the middle. */
const dirRift: Direction = (s, p) => {
  const { w, h, rng, d, look } = s;
  const a = look.accent;
  const crack: [number, number][] = [];
  let x = w / 2 + rnd(rng, -60, 60);
  const steps = rint(rng, 14, 22);
  for (let i = 0; i <= steps; i++) {
    crack.push([x, (i / steps) * h]);
    x = Math.max(w * 0.34, Math.min(w * 0.66, x + rnd(rng, -70, 70) + (w / 2 - x) * 0.25));
  }
  const line = crack.map((c, i) => (i ? "L" : "M") + n(c[0]) + " " + n(c[1])).join(" ");
  const light = look.paper ? look.sky[0] : mix(look.ink, a, 0.4);
  const out: string[] = [ground(s)];
  const g = linear(d, [[0, lighten(light, 0.2), 1], [1, darken(light, 0.25), 1]], 0, 0, 0, 1);
  out.push('<path d="M0 0 ' + line.replace("M", "L") + " L" + n(crack[crack.length - 1][0]) + " " + h + ' L0 ' + h + ' Z" fill="url(#' + g + ')"/>');
  const word = (body: string, x0: number, fill: string, op: number) => {
    const cx = x0 + 70;
    return '<g transform="rotate(-90 ' + n(cx) + " " + n(h * 0.34) + ')">' + text(cx, h * 0.34, body, { size: s.tall ? 300 : 200, fill, italic: true, anchor: "middle", opacity: op }) + "</g>";
  };
  out.push(word("trust", w * 0.17, darken(light, 0.45), 0.4));
  out.push(word("betray", w * 0.83, a, 0.3));
  const bits: string[] = [];
  for (let i = 0; i < 26; i++) {
    const c = crack[rint(rng, 0, crack.length - 1)];
    const px = c[0] + rnd(rng, -150, 150);
    const py = c[1] + rnd(rng, -60, 60);
    const sz = rnd(rng, 8, 34);
    bits.push('<path d="M' + n(px) + " " + n(py) + " l" + n(sz) + " " + n(rnd(rng, -sz, sz)) + " l" + n(rnd(rng, -sz, 0)) + " " + n(sz) + ' Z" fill="' + (rng() > 0.7 ? p.hot : look.ink) + '" opacity="' + n(rnd(rng, 0.3, 0.8)) + '"/>');
  }
  out.push('<path d="' + line + '" stroke="' + a + '" stroke-width="22" fill="none" opacity="0.8" filter="url(#' + blur(d, 14) + ')"/>');
  out.push('<path d="' + line + '" stroke="' + lighten(a, 0.7) + '" stroke-width="3.5" fill="none" stroke-linejoin="bevel"/>');
  out.push(bits.join(""));
  const pad = 44;
  const stack = buildStack(s, stackOpts(s, { width: w - s.m * 2 - pad * 2, maxHeight: s.tall ? 700 : 420 }));
  const ph = stack.h + pad * 2;
  const py = Math.min(s.footRule - 30 - ph, s.tall ? h * 0.56 : h * 0.5);
  out.push('<rect x="' + s.m + '" y="' + n(py) + '" width="' + (w - s.m * 2) + '" height="' + n(ph) + '" fill="' + darken(look.sky[0], look.paper ? 0 : 0.2) + '" fill-opacity="0.93" stroke="' + a + '" stroke-width="2.5"/>');
  out.push(stack.draw(py + pad));
  out.push(footerBar(s));
  return out.join("\n  ");
};

/** 7 - a radar sweep that has found everyone at the table. */
const dirSonar: Direction = (s, p) => {
  const { w, rng, d, look } = s;
  const a = look.accent;
  const px = w * rnd(rng, 0.62, 0.8);
  const py = s.top + (s.tall ? 150 : 40);
  const gap = s.tall ? 100 : 78;
  const rings = 8;
  const out: string[] = [ground(s)];
  const R = gap * rings;
  const sweepA = rnd(rng, 0.2, 1.2);
  const [sx, sy] = polar(px, py, R, sweepA);
  const [ex, ey] = polar(px, py, R, sweepA + 0.62);
  const sg = radial(d, [[0, a, 0.5], [1, a, 0.02]], px / w, py / s.h, R / Math.max(w, s.h));
  out.push('<path d="M' + n(px) + " " + n(py) + " L" + n(sx) + " " + n(sy) + " A" + R + " " + R + " 0 0 1 " + n(ex) + " " + n(ey) + ' Z" fill="url(#' + sg + ')"/>');
  for (let i = 1; i <= rings; i++) {
    out.push('<circle cx="' + n(px) + '" cy="' + n(py) + '" r="' + i * gap + '" fill="none" stroke="' + a + '" stroke-opacity="' + n(0.55 - i * 0.05) + '" stroke-width="' + (i % 3 === 0 ? 2.4 : 1.2) + '"' + (i % 2 ? ' stroke-dasharray="4 8"' : "") + "/>");
  }
  const ticks: string[] = [];
  for (let i = 0; i < 90; i++) {
    const [x1, y1] = polar(px, py, R, (i / 90) * Math.PI * 2);
    const [x2, y2] = polar(px, py, R + (i % 5 === 0 ? 24 : 11), (i / 90) * Math.PI * 2);
    ticks.push('<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '"/>');
  }
  out.push('<g stroke="' + look.ink + '" stroke-opacity="0.4">' + ticks.join("") + "</g>");
  out.push('<line x1="' + n(px - R) + '" y1="' + n(py) + '" x2="' + n(px + R) + '" y2="' + n(py) + '" stroke="' + a + '" stroke-opacity="0.3"/>');
  out.push('<line x1="' + n(px) + '" y1="' + n(py - R) + '" x2="' + n(px) + '" y2="' + n(py + R) + '" stroke="' + a + '" stroke-opacity="0.3"/>');
  const halo = blur(d, 8);
  const blips = rint(rng, 5, 9);
  const bad = rint(rng, 0, blips - 1);
  for (let i = 0; i < blips; i++) {
    const [bx, by] = polar(px, py, rnd(rng, gap * 0.8, gap * 6.5), rnd(rng, 0, Math.PI * 2));
    const hot = i === bad;
    const col = hot ? p.hot : look.ink;
    out.push('<circle cx="' + n(bx) + '" cy="' + n(by) + '" r="' + (hot ? 26 : 16) + '" fill="' + col + '" opacity="0.45" filter="url(#' + halo + ')"/>');
    out.push('<circle cx="' + n(bx) + '" cy="' + n(by) + '" r="' + (hot ? 8 : 5.5) + '" fill="' + col + '"/>');
    if (hot) out.push('<circle cx="' + n(bx) + '" cy="' + n(by) + '" r="24" fill="none" stroke="' + col + '" stroke-width="2"/>');
  }
  out.push('<circle cx="' + n(px) + '" cy="' + n(py) + '" r="9" fill="' + a + '"/>');
  const topEdge = s.top + (s.tall ? 560 : 330);
  out.push(scrim(s, topEdge - 80, 0.88));
  const stack = buildStack(s, stackOpts(s, { x: s.m, anchor: "start", maxHeight: s.bottom - topEdge }));
  out.push(stack.draw(s.bottom - stack.h));
  out.push(footerBar(s));
  return out.join("\n  ");
};

/** 8 - a wax seal pressed into the invitation to a very bad evening. */
const dirWax: Direction = (s, p) => {
  const { w, rng, d, look } = s;
  const a = look.accent;
  const R = s.tall ? 210 : 150;
  const cx = w / 2 + rnd(rng, -50, 50);
  const cy = s.top + R + 30;
  const out: string[] = [ground(s)];
  for (const ang of [rnd(rng, -32, -12), rnd(rng, 12, 32)]) {
    out.push('<rect x="' + n(-w * 0.2) + '" y="' + n(cy - 22) + '" width="' + n(w * 1.4) + '" height="44" fill="' + a + '" opacity="0.22" transform="rotate(' + n(ang) + " " + n(cx) + " " + n(cy) + ')"/>');
  }
  const drips: string[] = [];
  for (let i = 0; i < 3; i++) {
    const dx = cx + rnd(rng, -R * 0.6, R * 0.6);
    const dl = rnd(rng, R * 0.25, R * 0.55);
    drips.push('<path d="M' + n(dx - 16) + " " + n(cy + R * 0.7) + " Q" + n(dx - 20) + " " + n(cy + R + dl) + " " + n(dx) + " " + n(cy + R + dl) + " Q" + n(dx + 20) + " " + n(cy + R + dl) + " " + n(dx + 16) + " " + n(cy + R * 0.7) + ' Z"/>');
  }
  const blobN = 28;
  const blob: [number, number][] = [];
  for (let i = 0; i < blobN; i++) blob.push(polar(cx, cy, R * rnd(rng, 0.93, 1.07), (i / blobN) * Math.PI * 2));
  let path = "M" + n((blob[0][0] + blob[blobN - 1][0]) / 2) + " " + n((blob[0][1] + blob[blobN - 1][1]) / 2);
  for (let i = 0; i < blobN; i++) {
    const nx = blob[(i + 1) % blobN];
    path += " Q" + n(blob[i][0]) + " " + n(blob[i][1]) + " " + n((blob[i][0] + nx[0]) / 2) + " " + n((blob[i][1] + nx[1]) / 2);
  }
  const sg = radial(d, [[0, lighten(p.hot, 0.25), 1], [0.7, p.hot, 1], [1, darken(p.hot, 0.45), 1]], 0.4, 0.35, 0.8);
  out.push('<ellipse cx="' + n(cx + 14) + '" cy="' + n(cy + 22) + '" rx="' + n(R) + '" ry="' + n(R * 0.95) + '" fill="#000" opacity="0.35" filter="url(#' + blur(d, 20) + ')"/>');
  out.push('<g fill="url(#' + sg + ')">' + drips.join("") + '<path d="' + path + ' Z"/></g>');
  out.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(R * 0.78) + '" fill="none" stroke="' + lighten(p.hot, 0.45) + '" stroke-opacity="0.55" stroke-width="3"/>');
  out.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(R * 0.7) + '" fill="none" stroke="' + darken(p.hot, 0.5) + '" stroke-opacity="0.5" stroke-width="2"/>');
  out.push(emblem(d, rng, cx, cy, R * 0.52, lighten(p.hot, 0.4), lighten(p.hot, 0.65), look.sigil));
  const artBottom = cy + R * 1.5;
  const stack = buildStack(s, stackOpts(s, { maxHeight: s.bottom - artBottom }));
  out.push(stack.draw(artBottom + Math.max(0, (s.bottom - artBottom - stack.h) / 2)));
  out.push(footerBar(s));
  return out.join("\n  ");
};

const DIRECTIONS: { id: string; draw: Direction; paperOk: boolean }[] = [
  { id: "eclipse", draw: dirEclipse, paperOk: false },
  { id: "shards", draw: dirShards, paperOk: true },
  { id: "round-table", draw: dirConstellation, paperOk: false },
  { id: "tarot", draw: dirTarot, paperOk: true },
  { id: "poster", draw: dirType, paperOk: true },
  { id: "rift", draw: dirRift, paperOk: true },
  { id: "sonar", draw: dirSonar, paperOk: true },
  { id: "wax-seal", draw: dirWax, paperOk: true },
];

/**
 * `styleSeed` fixes the direction and palette (so a carousel stays one coherent
 * set); `seed` varies the details frame to frame.
 */
function renderFreedom(w: number, h: number, copy: Copy, seed: number, styleSeed: number, forceDirection?: number): string {
  const pr = mulberry32(styleSeed);
  const picked = DIRECTIONS[rint(pr, 0, DIRECTIONS.length - 1)];
  const dir = forceDirection === undefined ? picked : DIRECTIONS[forceDirection % DIRECTIONS.length];
  const pool = PALETTES.filter((p) => !p.paper || dir.paperOk);
  const p = pool[rint(pr, 0, pool.length - 1)];
  const look: Look = {
    id: "freedom-" + dir.id,
    layout: "skyline",
    motif: "moonrise",
    accent: p.accent,
    sky: p.sky,
    ink: p.ink,
    muted: p.muted,
    sigil: p.sigil,
    paper: p.paper,
  };
  const s = makeScene(w, h, look, copy, seed);
  return svgDoc(s, dir.draw(s, p) + backdropTexture(s, mulberry32(styleSeed ^ 0x9e3779b9)) + frameTreatment(s, p, mulberry32(styleSeed ^ 0x85ebca6b)));
}

/** A faint surface over the whole artwork: five unrelated textures plus none. */
function backdropTexture(s: Scene, r: Rng): string {
  const { w, h, look } = s;
  const c = look.paper ? look.ink : look.ink;
  const kind = rint(r, 0, 5);
  const o: string[] = [];
  if (kind === 1) {
    for (let k = -h; k < w; k += 26) o.push('<line x1="' + k + '" y1="' + h + '" x2="' + (k + h) + '" y2="0"/>');
    return '<g stroke="' + c + '" stroke-opacity="0.045" stroke-width="1.4">' + o.join("") + "</g>";
  }
  if (kind === 2) {
    for (let y = 14; y < h; y += 28) for (let x = (y / 28) % 2 ? 14 : 0; x < w; x += 28) o.push('<circle cx="' + x + '" cy="' + y + '" r="2.2"/>');
    return '<g fill="' + c + '" fill-opacity="0.06">' + o.join("") + "</g>";
  }
  if (kind === 3) {
    const cx = rnd(r, 0, w), cy = rnd(r, 0, h);
    for (let i = 1; i < 40; i++) o.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + i * 34 + '"/>');
    return '<g fill="none" stroke="' + look.accent + '" stroke-opacity="0.05" stroke-width="1.4">' + o.join("") + "</g>";
  }
  if (kind === 4) {
    const f = blur(s.d, 60);
    for (let i = 0; i < 6; i++) o.push('<circle cx="' + n(rnd(r, 0, w)) + '" cy="' + n(rnd(r, 0, h)) + '" r="' + n(rnd(r, 120, 340)) + '" fill="' + (i % 2 ? look.accent : look.sky[2]) + '" opacity="' + n(rnd(r, 0.08, 0.2)) + '"/>');
    return '<g filter="url(#' + f + ')">' + o.join("") + "</g>";
  }
  if (kind === 5) {
    const step = 54;
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) o.push('<path d="M' + (x + step / 2) + " " + (y + 8) + " L" + (x + step - 8) + " " + (y + step / 2) + " L" + (x + step / 2) + " " + (y + step - 8) + " L" + (x + 8) + " " + (y + step / 2) + ' Z"/>');
    return '<g fill="none" stroke="' + look.accent + '" stroke-opacity="0.05">' + o.join("") + "</g>";
  }
  return "";
}

/** Border treatment on the outer edge: none, hairline, double, or corner ticks. */
function frameTreatment(s: Scene, p: Palette, r: Rng): string {
  const { w, h, look } = s;
  const kind = rint(r, 0, 3);
  const a = look.accent;
  if (kind === 1) return '<rect x="26" y="26" width="' + (w - 52) + '" height="' + (h - 52) + '" fill="none" stroke="' + a + '" stroke-opacity="0.45" stroke-width="1.5"/>';
  if (kind === 2) {
    return '<rect x="22" y="22" width="' + (w - 44) + '" height="' + (h - 44) + '" fill="none" stroke="' + a + '" stroke-opacity="0.55" stroke-width="3"/>' +
      '<rect x="36" y="36" width="' + (w - 72) + '" height="' + (h - 72) + '" fill="none" stroke="' + a + '" stroke-opacity="0.3" stroke-width="1"/>';
  }
  if (kind === 3) {
    const t = 70, o = 28;
    const c = (x: number, y: number, dx: number, dy: number) => '<path d="M' + x + " " + (y + dy * t) + " L" + x + " " + y + " L" + (x + dx * t) + " " + y + '"/>';
    return '<g fill="none" stroke="' + a + '" stroke-opacity="0.75" stroke-width="3">' + c(o, o, 1, 1) + c(w - o, o, -1, 1) + c(o, h - o, 1, -1) + c(w - o, h - o, -1, -1) + "</g>";
  }
  return "";
}

/** Preview-sheet hook: render one freedom direction on demand. */
export function renderFreedomSample(w: number, h: number, copy: { kicker: string; headline: string; deck: string; cta: string }, seed: number, direction: number): string {
  return renderFreedom(w, h, copy, seed, seed * 7 + 3, direction);
}
export const freedomDirectionCount = DIRECTIONS.length;

/**
 * Deterministic variant choice: the same item always renders the same way.
 * `pickDesignVariant()` (history-aware, random) is only consulted when an item
 * has no stable id to hash.
 */
// Manuscript is excluded: it is a parchment layout (wax seal, illuminated
// capital, aged-paper texture) that only reads correctly with paper:true and
// a light sky. Forcing it onto the dark, paper:false ground every other
// randomized look uses produced no landscape art at all, just a border and a
// couple of near-invisible blooms - the "flat gradient block" this was
// chasing down.
const LAYOUT_IDS: LayoutId[] = ["skyline", "emblem", "split", "radial", "banner"];
const MOTIF_IDS: Motif[] = ["throne", "crypt", "council", "moonrise", "tower", "bloodmoon", "grove", "vigil", "dawn"];
// panelArt(), the artwork the split layout draws into its panel, only has
// bespoke art for these three motifs; every other motif falls through to the
// bare panel gradient with nothing drawn on it. The curated catalogue never
// hits this because it only ever pairs split with one of these three - the
// random mixer had no such restriction, so it could and did land on split
// paired with an unimplemented motif and render an empty panel.
const SPLIT_MOTIFS: Motif[] = ["throne", "crypt", "council"];
const SIGIL_IDS: Sigil[] = ["shield", "crown", "dagger", "star", "chalice"];
// The blue-purple family every ground used to be built from, whatever the
// accent or motif. Kept as the neutral base - most pieces should still read
// as "night" - but no longer the only tone available.
const NEUTRAL_BASES = [C.inkBlack, C.deepSpaceBlue, C.twilightIndigo, C.vintageGrape];
// Colour the ground can lean into instead, the way the curated catalogue
// pairs bloodmoon with a red-black ground and emerald-forest with a
// green-black one. Free mode picking only from NEUTRAL_BASES was the actual
// cause of every piece feeling like the same background reused: the accent
// changed, the underlying mood never did.
const MOOD_TINTS = [C.strawberryRed, C.emerald, C.gold];
const ACCENT_FAMILY = [C.gold, C.champagne, C.strawberryRed, C.emerald, C.coolSteel];

/**
 * Never invents a hue - every colour below is still a mix of named palette
 * colours - but every stop is a continuous blend at a randomised ratio
 * rather than one of a handful of colours picked verbatim. Two free-mode
 * pieces landing on literally the same hex is now close to impossible,
 * where before there were only 4 sky bases and 5 accents to draw from.
 */
function buildSky(rng: Rng, accent: string): [string, string, string] {
  const bases = [...NEUTRAL_BASES].sort(() => rng() - 0.5);
  // About a third of the time the ground leans into a mood tint beyond the
  // accent itself, so the underlying tone varies piece to piece and not just
  // the highlight colour on top of the same blue-purple night.
  const tint = rng() < 0.35 ? MOOD_TINTS[Math.floor(rng() * MOOD_TINTS.length)] : accent;
  return [
    mix(bases[0], tint, rnd(rng, 0, 0.18)),
    mix(bases[1], tint, rnd(rng, 0.08, 0.3)),
    mix(bases[2], accent, rnd(rng, 0.16, 0.4)),
  ];
}

/** A brand accent, then nudged lighter or darker so the exact shade is not one of five fixed swatches. */
function buildAccent(rng: Rng): string {
  const base = ACCENT_FAMILY[Math.floor(rng() * ACCENT_FAMILY.length)];
  return rng() < 0.5 ? lighten(base, rnd(rng, 0.04, 0.22)) : darken(base, rnd(rng, 0.04, 0.18));
}

/**
 * Builds a look by mixing the same primitives the curated catalogue draws
 * from, independently rather than as one of its twelve fixed pairings.
 *
 * The catalogue is what makes the template feed reliably on brand, but it is
 * also only twelve backgrounds - a free-mode piece rendered from it looked
 * exactly as templated as the curated feed, just with a different accent
 * colour on top. This picks layout, motif, sigil and a sky tuned to the
 * chosen accent independently of each other, seeded so the same item always
 * renders the same way but different free-mode items essentially never
 * repeat a combination - constrained to combinations every layout actually
 * has art for, per the notes above.
 */
function randomizeLook(seed: number, accentColor?: string): Look {
  const rng = mulberry32(seed);
  const layout = LAYOUT_IDS[Math.floor(rng() * LAYOUT_IDS.length)];
  const motifPool = layout === "split" ? SPLIT_MOTIFS : MOTIF_IDS;
  const motif = motifPool[Math.floor(rng() * motifPool.length)];
  const sigil = SIGIL_IDS[Math.floor(rng() * SIGIL_IDS.length)];
  const accent = accentColor || buildAccent(rng);
  const sky = buildSky(rng, accent);

  return {
    id: "free",
    layout,
    motif,
    accent,
    sky,
    ink: C.champagne,
    muted: mix(C.coolSteel, accent, 0.2 + rng() * 0.2),
    sigil,
    paper: false,
  };
}

function lookFor(item: ContentItem, override?: string): Look {
  const forced = lookById(override);
  if (forced) return forced;

  // Only free-mode pieces get the independently mixed treatment. Template
  // items, and anything generated before this existed, keep the exact
  // deterministic curated lookup they always had - no visual regression for
  // content already in the queue.
  if (item.generationMode === "free") {
    return randomizeLook(seedFrom((item.id || "free") + "|" + item.type), item.accentColor);
  }

  if (item.id) {
    return LOOKS[seedFrom(item.id + "|" + item.type + "|" + (item.theme || "")) % LOOKS.length];
  }
  return lookById(pickDesignVariant().id) || LOOKS[0];
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

export function renderPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    font: fontOptions(),
  });
  return Buffer.from(resvg.render().asPng());
}

/**
 * Every image an item needs. Carousels get one frame per slide (Instagram
 * requires at least two); everything else gets a single card.
 *
 * `variantOverride` is for preview sheets and tests - production callers pass
 * one argument and get the item's deterministic variant.
 */
/**
 * Splits a reel script into the beats the video cuts between.
 *
 * Capped at eight: past that each beat is on screen too briefly to read, and
 * every extra frame is another encode.
 */
export function reelBeats(item: ContentItem): string[] {
  const source = (item.reelScript || item.caption || item.title).trim();

  const lines = source
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Matching sentences rather than splitting on a lookbehind, which needs an
  // ES2018 target this project does not use.
  const beats = lines.length > 1
    ? lines
    : (source.match(/[^.!?]+[.!?]*/g) || []).map((s) => s.trim()).filter(Boolean);

  return (beats.length ? beats : [source]).slice(0, 8);
}

export function composeImages(
  item: ContentItem,
  variantOverride?: string
): { svg: string; label: string }[] {
  // An agent that produced its own artwork should keep it.
  if (item.svgCode && item.svgCode.includes("<svg")) {
    return [{ svg: item.svgCode, label: "art" }];
  }

  const design = item.design;
  const freedom = !variantOverride && design?.mode === "freedom";
  const forced = variantOverride || (design?.mode === "template" ? design.template : undefined);
  // lookFor already applies accentColor where it applies: baked into a
  // coherent free-mode look, or left alone on a curated template look, whose
  // sky and muted tones were tuned around its own accent and would mismatch
  // if only the accent were swapped on top of them after the fact.
  const look = lookFor(item, forced);
  const baseSeed = seedFrom((item.id || look.id) + look.id + (design?.seed ?? 0));
  const styleSeed = seedFrom((item.id || "freedom") + "|style|" + (design?.seed ?? 0));
  const cta = ctaFor(item);
  const draw = (w: number, h: number, copy: Copy, seed: number, i = 0) =>
    freedom
      ? design?.art?.[i] || renderFreedom(w, h, copy, seed, styleSeed)
      : renderCard(w, h, look, copy, seed);

  if (item.type === "story") {
    const frames = item.storyFrames && item.storyFrames.length ? item.storyFrames : [item.caption];
    return frames.slice(0, 5).map((frame, i) => {
      const { headline, deck } = splitCopy(frame);
      const copy: Copy = {
        kicker: frames.length > 1 ? "chapter " + ROMAN[i] : item.theme || "tonight",
        headline: headline || item.title,
        deck,
        cta: i === frames.length - 1 ? cta : "",
      };
      return {
        svg: draw(STORY.w, STORY.h, copy, baseSeed + i * 977, i),
        label: "frame-" + (i + 1),
      };
    });
  }

  // A reel is a vertical video, so its frames are 9:16 like a story rather
  // than the square card everything else fell back to. Each sentence of the
  // script becomes one beat, which is what the video is built from.
  if (item.type === "reel") {
    const beats = reelBeats(item);
    return beats.map((beat, i) => {
      const { headline, deck } = splitCopy(beat);
      const copy: Copy = {
        kicker: i === 0 ? item.theme || "the resistance night" : "",
        headline: headline || item.title,
        deck,
        cta: i === beats.length - 1 ? cta : "",
      };
      return {
        svg: renderCard(STORY.w, STORY.h, look, copy, baseSeed + i * 733),
        label: "beat-" + (i + 1),
      };
    });
  }

  if (item.type === "carousel" && item.slides && item.slides.length) {
    const slides = item.slides.slice(0, 10);
    return slides.map((slide, i) => {
      const { headline, deck } = splitCopy(slide);
      const copy: Copy = {
        kicker: i === 0 ? item.theme || "carousel" : ROMAN[i] + " of " + ROMAN[slides.length - 1],
        headline: headline || item.title,
        deck,
        cta: i === slides.length - 1 ? cta : "",
      };
      return {
        svg: draw(SQUARE.w, SQUARE.h, copy, baseSeed + i * 613, i),
        label: "slide-" + (i + 1),
      };
    });
  }

  const { headline, deck } = splitCopy(item.caption);
  const copy: Copy = {
    kicker: item.theme || item.type,
    headline: headline || item.title,
    deck,
    cta,
  };
  return [{ svg: draw(SQUARE.w, SQUARE.h, copy, baseSeed), label: "main" }];
}

/**
 * Renders an item's images and commits them to the content repo, returning
 * public raw URLs ready to hand to the Graph API.
 */
export async function renderAndUpload(item: ContentItem): Promise<string[]> {
  const images = composeImages(item);
  const urls: string[] = [];

  for (const image of images) {
    const png = renderPng(image.svg);
    const dir = item.createdAt.slice(0, 7);
    const url = await putBinary(
      "media/" + dir + "/" + item.id + "-" + image.label + ".png",
      png,
      "media: " + item.type + " " + item.id + " (" + image.label + ")"
    );
    urls.push(url);
  }

  return urls;
}

/**
 * Renders and attaches artwork right when a piece is created, so the queue
 * never shows a card with no preview waiting on a manual render click.
 * Failure here should never block a piece from being created - publishing
 * already renders on demand if imageUrls is still empty by then (see
 * publishContentItem in lib/publish.ts), so this is a head start, not the
 * only chance.
 */
export async function autoRenderContent(item: ContentItem): Promise<ContentItem> {
  if (!isStoreConfigured() || (item.imageUrls && item.imageUrls.length > 0)) return item;

  try {
    const imageUrls = await renderAndUpload(item);
    return { ...item, imageUrls };
  } catch (e) {
    console.error(`Auto-render failed for ${item.id}, will retry at publish time:`, e);
    return item;
  }
}
