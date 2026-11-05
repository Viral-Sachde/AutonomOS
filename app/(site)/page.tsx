import type { Metadata } from "next";
import DeptBands from "@/components/site/DeptBands";
import FlowStory from "@/components/site/FlowStory";
import Swirl from "@/components/site/Swirl";
import { ApprovalDemo, CountUp, OrchestratorDemo } from "@/components/site/demos";
import { Button, CTA, GITHUB, Headline, Kicker, Marquee, Reveal } from "@/components/site/ui";
import { TOTAL_AGENTS } from "@/lib/departments";

export const metadata: Metadata = {
  title: { absolute: "AutonomOS | Run the company on agents" },
};

export default function Home() {
  return (
    <>
      {/* Hero: the artwork, a few words, two buttons. */}
      <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-black">
        <div className="absolute inset-0"><Swirl seed={1} scale={1.35} /></div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[78%] bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.82)_42%,#000_70%)]" />
        <div className="pointer-events-none relative flex h-full flex-col justify-end px-4 pb-8 md:px-8 md:pb-10">
          <Headline as="h1" rise>Run the company on agents</Headline>
          <div className="pointer-events-auto mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href="/dashboard#command">Start free</Button>
            <Button href={GITHUB} variant="line">GitHub</Button>
            <Kicker className="sm:ml-auto">AI company orchestration · {TOTAL_AGENTS} agents</Kicker>
          </div>
        </div>
      </section>

      <div className="bg-cream text-black">
        <Marquee items={["Plan", "Delegate", "Coordinate", "Track"]} />
      </div>

      {/* How it works, as a scroll animation. */}
      <FlowStory />

      {/* Try it. */}
      <section className="bg-black px-4 py-24 md:px-8 md:py-32">
        <Reveal><Headline>Try it</Headline></Reveal>
        <Reveal delay={120} className="mt-10 border-t border-cream/15 pt-8">
          <OrchestratorDemo />
        </Reveal>
      </section>

      {/* Departments, as poster bands. */}
      <DeptBands />

      {/* Human in the loop, as a game. */}
      <section className="grid gap-12 bg-black px-4 py-24 md:grid-cols-[1fr_1.2fr] md:items-center md:px-8 md:py-32">
        <Reveal><Headline>You approve</Headline></Reveal>
        <Reveal delay={120}><ApprovalDemo /></Reveal>
      </section>

      <section className="grid grid-cols-3 border-y border-cream/15 bg-black">
        {[
          [<CountUp key="a" to={TOTAL_AGENTS} />, "agents"],
          [<CountUp key="b" to={4} />, "departments"],
          [<CountUp key="c" to={0} prefix="$" />, "to start"],
        ].map(([v, l], i) => (
          <div key={i} className={`px-4 py-10 md:px-8 md:py-16 ${i < 2 ? "border-r border-cream/15" : ""}`}>
            <div className="font-display text-[16vw] font-bold leading-[0.8] tracking-[-0.07em] md:text-[12vw]">{v}</div>
            <p className="mt-4 text-[13px] font-medium uppercase tracking-[0.12em] text-mist">{l}</p>
          </div>
        ))}
      </section>

      <CTA />
    </>
  );
}
