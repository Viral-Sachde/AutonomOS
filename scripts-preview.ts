import fs from "fs";
import { composeImages, renderPng, designVariantIds } from "./lib/render";
import { ContentItem } from "./lib/design-system";

/**
 * Preview harness: `npx tsx scripts-preview.ts <outdir> [filter]`
 *
 * Renders the stress cases the composer has to survive - a four word headline,
 * a twenty-five word headline, a three slide carousel, a story with body copy -
 * across every design variant, so a bad wrap or a collision is visible instead
 * of theoretical. `filter` limits output to variant ids containing that string.
 */

const out = process.argv[2];
const filter = process.argv[3] || "";

if (!out) {
  console.error("usage: npx tsx scripts-preview.ts <outdir> [variant-filter]");
  process.exit(1);
}
fs.mkdirSync(out, { recursive: true });

const base = {
  hashtags: ["#TheResistanceNight"],
  status: "pending" as const,
  createdAt: new Date().toISOString(),
  theme: "deception & trust",
};

const SHORT = "your friend just failed";
const LONG =
  "your best friend just voted to fail the mission and looked you dead in the eye while doing it, and now the whole table is arguing about who deserves the blame tonight";

const cases: ContentItem[] = [
  {
    ...base,
    id: "short",
    type: "post",
    title: "Short headline",
    caption: SHORT + "\nfive players. two traitors. one very long night.",
  },
  {
    ...base,
    id: "long",
    type: "post",
    title: "Long headline",
    caption: LONG,
  },
  {
    ...base,
    id: "carousel",
    type: "carousel",
    title: "Carousel",
    caption: "merlin knows",
    slides: [
      "merlin knows every traitor at this table",
      "but if he speaks too clearly the assassin finds him before the third mission ends",
      "so he lies. carefully. and hopes percival is listening.",
    ],
  },
  {
    ...base,
    id: "story",
    type: "story",
    title: "Story",
    caption: "who do you trust tonight?",
    storyFrames: [
      "who do you trust tonight?\nfive friends. two traitors. one phone. nobody says what they really mean and everybody is watching everybody else.",
    ],
  },
  {
    ...base,
    id: "reel",
    type: "reel",
    title: "Reel",
    caption: "the vote that ended a friendship\nit took four seconds and nobody has recovered.",
  },
];

let count = 0;
for (const variant of designVariantIds) {
  if (filter && !variant.includes(filter)) continue;
  for (const item of cases) {
    for (const img of composeImages(item, variant)) {
      const name = `${variant}--${item.id}-${img.label}.png`;
      fs.writeFileSync(`${out}/${name}`, renderPng(img.svg));
      count++;
    }
  }
}
console.log(`wrote ${count} previews to ${out}`);
