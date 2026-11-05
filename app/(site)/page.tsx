import type { Metadata } from "next";
import Swirl from "@/components/site/Swirl";
import { ApprovalDemo, CountUp, DeptDemo, OrchestratorDemo } from "@/components/site/demos";
import { CTA, Frame, GITHUB, GhostButton, Headline, Label, PrimaryButton, Section } from "@/components/site/ui";
import { TOTAL_AGENTS } from "@/lib/departments";

export const metadata: Metadata = {
  title: { absolute: "AutonomOS | Run the company on agents" },
};

export default function Home() {
  return (
    <>
      <section className="relative h-[100svh] min-h-[620px] overflow-hidden bg-night">
        <div className="absolute inset-0"><Swirl seed={1} scale={1.35} /></div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,24,39,0.5)_0%,transparent_28%,transparent_45%,rgba(18,24,39,1)_100%),radial-gradient(70%_60%_at_15%_85%,rgba(18,24,39,0.85),transparent_70%)]" />
        <div className="pointer-events-none relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-14 md:px-8 md:pb-20">
          <div className="w-fit rounded-full bg-night/70 px-3.5 py-1.5 backdrop-blur"><Label>AI company orchestration</Label></div>
          <Headline as="h1" className="mt-5 max-w-5xl">Run the company on agents.</Headline>
          <div className="pointer-events-auto mt-9 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton href="/dashboard#command">Try it</PrimaryButton>
            <GhostButton href={GITHUB}>GitHub</GhostButton>
          </div>
        </div>
      </section>

      <Section>
        <Label>Give it a goal</Label>
        <div className="mt-8">
          <Frame url="app.autonomos / command">
            <div className="p-5 md:p-8"><OrchestratorDemo /></div>
          </Frame>
        </div>
      </Section>

      <Section className="!pt-0">
        <Label>Four departments</Label>
        <div className="mt-8"><DeptDemo /></div>
      </Section>

      <Section className="!pt-0">
        <div className="text-center"><Label>You approve</Label></div>
        <div className="mt-10"><ApprovalDemo /></div>
      </Section>

      <Section className="!pt-0">
        <div className="grid grid-cols-3 gap-4 border-y border-cream/[0.08] py-12 text-center">
          {[
            [<CountUp key="a" to={TOTAL_AGENTS} />, "agents"],
            [<CountUp key="b" to={4} />, "departments"],
            [<CountUp key="c" to={0} prefix="$" />, "to start"],
          ].map(([v, l], i) => (
            <div key={i}>
              <div className="font-display text-[56px] font-semibold leading-none tracking-[-0.06em] md:text-[96px]">{v}</div>
              <p className="mt-3 font-mono text-[11.5px] uppercase tracking-[0.18em] text-mist">{l}</p>
            </div>
          ))}
        </div>
      </Section>

      <CTA />
    </>
  );
}
