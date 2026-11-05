import type { Metadata } from "next";
import { Check } from "lucide-react";
import Swirl from "@/components/site/Swirl";
import { CTA, GITHUB, Headline, Reveal } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free and open source. Cloud in early access. Enterprise on request.",
};

const PLANS = [
  { name: "Open source", price: "Free", cta: ["Get the code", GITHUB], items: ["All departments", "Demo mode", "Self-hosted"], bg: "#050505", fg: "#EDE4CF" },
  { name: "Cloud", price: "Soon", cta: ["Start", "/dashboard#command"], items: ["Managed hosting", "Team sign-in", "Usage controls"], bg: "#4FA89B", fg: "#050505" },
  { name: "Enterprise", price: "Talk", cta: ["Contact", "mailto:hello@example.com"], items: ["Custom agents", "Private models", "SSO and audit"], bg: "#EDE4CF", fg: "#050505" },
];

export default function PricingPage() {
  return (
    <>
      <section className="relative h-[70svh] min-h-[480px] overflow-hidden bg-black">
        <div className="absolute inset-0"><Swirl seed={3} scale={1.4} /></div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.8)_45%,#000_75%)]" />
        <div className="pointer-events-none relative flex h-full flex-col justify-end px-4 pb-10 md:px-8">
          <Headline as="h1" rise>Start free</Headline>
        </div>
      </section>
      <section className="grid border-t border-cream/15 md:grid-cols-3">
        {PLANS.map((p, i) => (
          <Reveal key={p.name} delay={i * 100} className="h-full">
            <div className="flex h-full min-h-[520px] flex-col p-6 md:p-8" style={{ background: p.bg, color: p.fg }}>
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] opacity-70">{p.name}</p>
              <p className="mt-6 font-display text-[22vw] font-bold uppercase leading-[0.8] tracking-[-0.07em] md:text-[8vw]">{p.price}</p>
              <ul className="mt-10 space-y-3">
                {p.items.map((x) => <li key={x} className="flex items-center gap-3 text-[17px]"><Check size={18} /> {x}</li>)}
              </ul>
              <a href={p.cta[1]} className="mt-auto inline-flex items-center justify-center border-2 py-4 text-[15px] font-semibold uppercase tracking-[0.06em] transition-opacity hover:opacity-80" style={{ borderColor: p.fg }}>
                {p.cta[0]}
              </a>
            </div>
          </Reveal>
        ))}
      </section>
      <CTA seed={10} line="No card. No credits." />
    </>
  );
}
