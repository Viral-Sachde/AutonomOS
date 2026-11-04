import fs from "fs";
import { renderFreedomSample, renderPng, freedomDirectionCount } from "./lib/render";

/** `npx tsx scripts-freedom.ts <outdir> [seed] [tall]` - one sheet per seed, every direction. */
const out = process.argv[2];
const seed = Number(process.argv[3] || 1);
const tall = process.argv[4] === "tall";
if (!out) { console.error("usage: tsx scripts-freedom.ts <outdir> [seed] [tall]"); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

const copy = {
  kicker: "deception & trust",
  headline: "your best friend just voted to fail the mission",
  deck: "five players. two traitors. one very long night of looking people in the eye.",
  cta: "link in bio",
};
const w = 1080, h = tall ? 1920 : 1080;
const cells: string[] = [];
const cols = tall ? 4 : 4;
const cw = 540, ch = tall ? 960 : 540;
for (let d = 0; d < freedomDirectionCount; d++) {
  const png = renderPng(renderFreedomSample(w, h, copy, seed + d * 31, d));
  fs.writeFileSync(`${out}/dir${d}-s${seed}${tall ? "-tall" : ""}.png`, png);
  const x = (d % cols) * cw, y = Math.floor(d / cols) * ch;
  cells.push(`<image x="${x}" y="${y}" width="${cw}" height="${ch}" href="data:image/png;base64,${png.toString("base64")}"/>`);
}
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cw}" height="${Math.ceil(freedomDirectionCount / cols) * ch}">${cells.join("")}</svg>`;
fs.writeFileSync(`${out}/sheet-s${seed}${tall ? "-tall" : ""}.png`, renderPng(sheet));
console.log("done");
