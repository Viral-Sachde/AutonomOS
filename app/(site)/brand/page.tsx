import type { Metadata } from "next";
import { Download } from "lucide-react";
import Mark, { Wordmark } from "@/components/site/Mark";
import { Swatch, SwirlPlayground } from "@/components/site/demos";
import { Headline, Label, Section } from "@/components/site/ui";
import { DEPARTMENTS } from "@/lib/departments";

export const metadata: Metadata = {
  title: "Brand",
  description: "The AutonomOS mark, palette, type and the live swirl.",
};

const CORE = [
  { name: "Night", hex: "#121827" },
  { name: "Slate", hex: "#3A4256" },
  { name: "Bronze", hex: "#9C6B47" },
  { name: "Teal", hex: "#4FA89B" },
  { name: "Cream", hex: "#EDE4CF", dark: true },
  { name: "Periwinkle", hex: "#6E8CCB" },
];

const FILES = [
  ["mark.svg", "Mark"], ["glyph.svg", "Round mark"], ["wordmark-dark.svg", "Wordmark, dark"], ["wordmark-light.svg", "Wordmark, light"],
  ...DEPARTMENTS.map((d) => [`${d.id}.svg`, d.name]),
];

export default function BrandPage() {
  return (
    <>
      <section className="px-4 pb-10 pt-36 md:px-8">
        <div className="mx-auto grid max-w-7xl items-end gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <Label>Brand</Label>
            <Headline as="h1" className="mt-5">Work, flowing.</Headline>
          </div>
          <div className="flex justify-start gap-4 lg:justify-end">
            <Mark size={150} id="b-hero" />
            <Mark size={150} shape="disc" id="b-disc" />
          </div>
        </div>
      </section>

      <Section className="!pt-10">
        <Label>Mark</Label>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <div className="flex h-56 items-center justify-center rounded-[24px] border border-cream/[0.08] bg-night-2"><Wordmark size={34} id="b-wd" /></div>
          <div className="flex h-56 items-center justify-center rounded-[24px] bg-cream"><Wordmark size={34} dark={false} id="b-wl" /></div>
          <div className="flex h-56 items-center justify-center gap-5 rounded-[24px] border border-cream/[0.08] bg-night-2">
            {[64, 40, 24, 16].map((s) => <Mark key={s} size={s} id={`b-s${s}`} />)}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {DEPARTMENTS.map((d) => (
            <div key={d.id} className="flex items-center gap-4 rounded-[22px] border border-cream/[0.08] bg-night-2 p-5">
              <Mark size={52} accent={d.color} id={`b-d-${d.id}`} />
              <div>
                <p className="font-display text-[18px] font-semibold tracking-[-0.03em]">{d.name}</p>
                <p className="font-mono text-[11px] text-mist">{d.color.toUpperCase()}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="!pt-0">
        <Label>Palette · click to copy</Label>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {CORE.map((c) => <Swatch key={c.name} {...c} />)}
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full">
          {[["#121827", 55], ["#3A4256", 12], ["#9C6B47", 6], ["#4FA89B", 9], ["#EDE4CF", 12], ["#6E8CCB", 6]].map(([c, w]) => <div key={c} style={{ background: c as string, width: `${w}%` }} />)}
        </div>
      </Section>

      <Section className="!pt-0">
        <Label>Swirl · live</Label>
        <div className="mt-8"><SwirlPlayground /></div>
      </Section>

      <Section className="!pt-0">
        <Label>Type</Label>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {[
            ["font-display", "Bricolage Grotesque", "Display"],
            ["font-sans", "Hanken Grotesk", "Text"],
            ["font-mono", "JetBrains Mono", "Labels"],
          ].map(([f, n, u]) => (
            <div key={n} className="rounded-[24px] border border-cream/[0.08] bg-night-2 p-7">
              <p className={`${f} text-[96px] font-semibold leading-none tracking-[-0.04em]`}>Aa</p>
              <p className={`${f} mt-6 text-[19px] font-semibold`}>{n}</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mist">{u}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="downloads" className="!pt-0">
        <Label>Files</Label>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {FILES.map(([f, l]) => (
            <a key={f} href={`/brand/${f}`} download className="group overflow-hidden rounded-[22px] border border-cream/[0.08] hover:border-cream/25">
              <div className={`flex h-32 items-center justify-center ${f === "wordmark-light.svg" ? "bg-cream" : "bg-night-2"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/brand/${f}`} alt="" className={f.startsWith("wordmark") ? "w-[80%]" : "h-14 w-14"} />
              </div>
              <div className="flex items-center justify-between bg-night-2 px-4 py-3 text-[13px] text-mist">
                {l} <Download size={14} className="group-hover:text-cream" />
              </div>
            </a>
          ))}
        </div>
      </Section>
    </>
  );
}
