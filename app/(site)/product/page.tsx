import type { Metadata } from "next";
import FlowStory from "@/components/site/FlowStory";
import Swirl from "@/components/site/Swirl";
import { ApprovalDemo, ChainDemo, DeptWidget, OrchestratorDemo } from "@/components/site/demos";
import { CTA, Headline, Marquee, Reveal } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Product",
  description: "Plan, delegate, coordinate, track. The AutonomOS orchestrator, shown live.",
};

export default function ProductPage() {
  return (
    <>
      <section className="relative h-[85svh] min-h-[560px] overflow-hidden bg-black">
        <div className="absolute inset-0"><Swirl seed={9} scale={1.6} accent="#4FA89B" /></div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.8)_45%,#000_75%)]" />
        <div className="pointer-events-none relative flex h-full flex-col justify-end px-4 pb-10 md:px-8">
          <Headline as="h1" rise>How it works</Headline>
        </div>
      </section>

      <FlowStory />

      <div className="bg-teal text-black"><Marquee items={["One goal", "Four teams", "Zero busywork"]} /></div>

      <section className="bg-black px-4 py-24 md:px-8 md:py-32">
        <Reveal><Headline>Plan</Headline></Reveal>
        <Reveal delay={120} className="mt-10 border-t border-cream/15 pt-8"><OrchestratorDemo /></Reveal>
      </section>

      <section className="bg-black px-4 pb-24 md:px-8 md:pb-32">
        <Reveal><Headline>Coordinate</Headline></Reveal>
        <Reveal delay={120} className="mt-10 border-t border-cream/15 pt-8"><ChainDemo /></Reveal>
      </section>

      <section className="bg-ops px-4 py-16 text-black md:px-8 md:py-24">
        <Reveal><Headline>Track</Headline></Reveal>
        <Reveal delay={120} className="mt-10 bg-black p-4 text-cream md:p-6"><DeptWidget id="operations" /></Reveal>
      </section>

      <section className="grid gap-12 bg-black px-4 py-24 md:grid-cols-[1fr_1.2fr] md:items-center md:px-8 md:py-32">
        <Reveal><Headline>Approve</Headline></Reveal>
        <Reveal delay={120}><ApprovalDemo /></Reveal>
      </section>

      <CTA seed={3} />
    </>
  );
}
