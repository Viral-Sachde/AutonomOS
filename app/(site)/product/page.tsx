import type { Metadata } from "next";
import OrchestratorGraph from "@/components/OrchestratorGraph";
import Swirl from "@/components/site/Swirl";
import { ApprovalDemo, ChainDemo, DeptWidget, OrchestratorDemo } from "@/components/site/demos";
import { CTA, Frame, Headline, Label, Section } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Product",
  description: "Plan, delegate, coordinate, track. The AutonomOS orchestrator, shown live.",
};

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <Section className="border-t border-cream/[0.07]">
      <div className="mb-10 flex items-baseline gap-4">
        <span className="font-mono text-[13px] text-teal">{n}</span>
        <Headline>{title}</Headline>
      </div>
      {children}
    </Section>
  );
}

export default function ProductPage() {
  return (
    <>
      <section className="relative h-[70svh] min-h-[480px] overflow-hidden bg-night">
        <div className="absolute inset-0"><Swirl seed={9} scale={1.6} accent="#4FA89B" /></div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(18,24,39,1)_100%)]" />
        <div className="pointer-events-none relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-14 md:px-8">
          <div className="w-fit rounded-full bg-night/70 px-3.5 py-1.5 backdrop-blur"><Label>Product</Label></div>
          <Headline as="h1" className="mt-5">Plan. Delegate. Coordinate. Track.</Headline>
        </div>
      </section>

      <Step n="01" title="Plan">
        <Frame url="app.autonomos / command"><div className="p-5 md:p-8"><OrchestratorDemo compact /></div></Frame>
      </Step>

      <Step n="02" title="Delegate">
        <div className="flex justify-center rounded-[28px] border border-cream/[0.08] bg-night-2 p-6 text-cream md:p-10">
          <OrchestratorGraph active={["marketing", "sales", "intelligence", "operations"]} counts={{ marketing: 10, sales: 4, intelligence: 4, operations: 4 }} size={420} />
        </div>
      </Step>

      <Step n="03" title="Coordinate">
        <ChainDemo />
      </Step>

      <Step n="04" title="Track">
        <div className="rounded-[24px] border border-cream/[0.08] bg-night-2 p-5 md:p-7"><DeptWidget id="operations" /></div>
        <div className="mt-16"><ApprovalDemo /></div>
      </Step>

      <CTA seed={3} />
    </>
  );
}
