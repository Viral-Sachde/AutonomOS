import type { Metadata } from "next";
import { Check } from "lucide-react";
import Swirl from "@/components/site/Swirl";
import { CTA, GITHUB, Headline, Label } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free and open source. Cloud in early access. Enterprise on request.",
};

const PLANS = [
  { name: "Open source", price: "Free", cta: ["Get the code", GITHUB], items: ["All departments", "Demo mode", "Self-hosted"], hot: false },
  { name: "Cloud", price: "Early access", cta: ["Start", "/dashboard#command"], items: ["Everything in Open source", "Managed hosting", "Team sign-in"], hot: true },
  { name: "Enterprise", price: "Let's talk", cta: ["Contact", "mailto:hello@example.com"], items: ["Custom agents", "Private models", "SSO and audit"], hot: false },
];

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-night px-4 pb-20 pt-36 md:px-8">
        <div className="absolute inset-x-0 top-0 h-[420px] opacity-60"><Swirl seed={3} scale={1.4} /></div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[linear-gradient(180deg,transparent,rgba(18,24,39,1))]" />
        <div className="relative mx-auto max-w-7xl">
          <Label>Pricing</Label>
          <Headline as="h1" className="mt-5">Start free.</Headline>
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.name} className={`flex flex-col rounded-[26px] border p-8 backdrop-blur ${p.hot ? "border-teal/50 bg-teal/[0.08]" : "border-cream/[0.08] bg-night-2/80"}`}>
                <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-mist">{p.name}</p>
                <p className="mt-8 font-display text-[48px] font-semibold leading-none tracking-[-0.05em]">{p.price}</p>
                <ul className="mt-8 space-y-3">
                  {p.items.map((x) => <li key={x} className="flex items-center gap-3 text-[15px]"><Check size={16} className="text-teal" /> {x}</li>)}
                </ul>
                <a href={p.cta[1]} className={`mt-10 inline-flex items-center justify-center rounded-full px-5 py-3 text-[15px] font-semibold ${p.hot ? "bg-cream text-night hover:bg-star" : "border border-cream/15 text-cream hover:border-cream/35"}`}>{p.cta[0]}</a>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CTA seed={10} line="No card. No credits." />
    </>
  );
}
