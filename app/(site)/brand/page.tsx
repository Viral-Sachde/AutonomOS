import type { Metadata } from "next";
import { Download } from "lucide-react";
import Mark, { Wordmark } from "@/components/site/Mark";
import Swirl from "@/components/site/Swirl";
import { Swatch, SwirlPlayground } from "@/components/site/demos";
import { Headline, Marquee, Reveal } from "@/components/site/ui";
import { DEPARTMENTS } from "@/lib/departments";

export const metadata: Metadata = {
  title: "Brand",
  description: "The AutonomOS mark, palette, type and the live swirl.",
};

const CORE = [
  { name: "Black", hex: "#050505" },
  { name: "Slate", hex: "#2A2D33" },
  { name: "Bronze", hex: "#9C6B47" },
  { name: "Teal", hex: "#4FA89B" },
  { name: "Cream", hex: "#EDE4CF", dark: true },
  { name: "Periwinkle", hex: "#6E8CCB" },
];

const FILES = [
  ["mark.svg", "Mark"], ["glyph.svg", "Round mark"], ["wordmark-dark.svg", "Wordmark dark"], ["wordmark-light.svg", "Wordmark light"],
  ...DEPARTMENTS.map((d) => [`${d.id}.svg`, d.name]),
];

export default function BrandPage() {
  return (
    <>
      <section className="relative h-[85svh] min-h-[560px] overflow-hidden bg-black">
        <div className="absolute inset-0"><Swirl seed={14} scale={1.5} /></div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.8)_45%,#000_75%)]" />
        <div className="pointer-events-none relative flex h-full flex-col justify-end px-4 pb-10 md:px-8">
          <Headline as="h1" rise>Work flowing</Headline>
        </div>
      </section>

      <section className="grid bg-black md:grid-cols-2">
        <Reveal className="flex aspect-square items-center justify-center bg-black p-[12%]"><Mark size="100%" id="b-big" /></Reveal>
        <Reveal delay={100} className="flex aspect-square items-center justify-center bg-cream p-[12%]"><Mark size="100%" shape="disc" id="b-disc" /></Reveal>
      </section>

      <section className="grid md:grid-cols-2">
        <div className="flex h-[40vh] items-center justify-center bg-black"><Wordmark size={48} id="b-wd" /></div>
        <div className="flex h-[40vh] items-center justify-center bg-cream"><Wordmark size={48} dark={false} id="b-wl" /></div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4">
        {DEPARTMENTS.map((d) => (
          <div key={d.id} className="flex aspect-square flex-col justify-between p-5 text-black" style={{ background: d.color }}>
            <Mark size="40%" accent={d.color} id={`b-d-${d.id}`} />
            <div>
              <p className="font-display text-[28px] font-bold uppercase leading-none tracking-[-0.04em]">{d.name}</p>
              <p className="mt-1 text-[12px] font-semibold">{d.color.toUpperCase()}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {CORE.map((c) => <Swatch key={c.name} {...c} />)}
      </section>

      <div className="bg-black text-cream"><Marquee items={["Bricolage Grotesque", "Hanken Grotesk", "JetBrains Mono"]} /></div>

      <section className="bg-black px-4 py-20 md:px-8">
        <Reveal><Headline>Make one</Headline></Reveal>
        <div className="mt-10"><SwirlPlayground /></div>
      </section>

      <section id="downloads" className="grid grid-cols-2 bg-black md:grid-cols-4">
        {FILES.map(([f, l]) => (
          <a key={f} href={`/brand/${f}`} download className="group border-r border-t border-cream/15">
            <div className={`flex h-40 items-center justify-center ${f === "wordmark-light.svg" ? "bg-cream" : "bg-black"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/brand/${f}`} alt="" className={f.startsWith("wordmark") ? "w-[78%]" : "h-16 w-16"} />
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-mist group-hover:text-cream">
              {l} <Download size={14} />
            </div>
          </a>
        ))}
      </section>
      <div className="h-px bg-cream/15" />
    </>
  );
}
