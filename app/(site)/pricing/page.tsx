import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { CTA, Display, Eyebrow, GITHUB, Lead, Section } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Self-host AutonomOS for free, join cloud early access, or talk to us about enterprise.",
};

const PLANS = [
  {
    name: "Open source",
    price: "Free",
    note: "forever, self-hosted",
    body: "The whole platform on your own infrastructure. Start in demo mode, bring a model when ready.",
    cta: ["Get the source", GITHUB],
    features: ["All four departments", `Orchestrator and live board`, "Demo mode with sample data", "Bring your own Claude or Gemini key", "Community support"],
    featured: false,
  },
  {
    name: "Cloud",
    price: "Early access",
    note: "hosted for you",
    body: "We run it, you run the company. Managed storage, scheduling and upgrades.",
    cta: ["Open the app", "/dashboard#command"],
    features: ["Everything in Open source", "Managed hosting and cron", "Team sign-in", "Usage and credit controls", "Priority fixes"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Let's talk",
    note: "for larger teams",
    body: "Custom agents, private models and the controls your security team will ask for.",
    cta: ["Contact sales", "mailto:hello@example.com"],
    features: ["Everything in Cloud", "Custom departments and agents", "Private model endpoints", "SSO and audit log", "Onboarding with our team"],
    featured: false,
  },
];

const ROWS: [string, boolean | string, boolean | string, boolean | string][] = [
  ["Marketing, Sales, Intelligence, Operations", true, true, true],
  ["Orchestrator, plans and live board", true, true, true],
  ["Approval before customer-facing work ships", true, true, true],
  ["Demo mode, no model spend", true, true, true],
  ["Hosting and scheduling", "You", "Managed", "Managed or private"],
  ["Team sign-in", "Basic", true, "SSO"],
  ["Custom agents", "Fork it", false, true],
  ["Support", "Community", "Priority", "Dedicated"],
];

const FAQ = [
  ["Do I need an AI provider to start?", "No. Demo mode runs every agent on built-in templates and sample data. Add a Claude or Gemini key only when you want model-written output."],
  ["What does it cost to run with a model?", "That depends on your provider and volume. The app records token usage per agent on the credits screen so you can see exactly where spend goes."],
  ["Will Cloud have a free tier?", "Cloud is in early access while we finalise plans. Open source stays free regardless."],
];

const cell = (v: boolean | string) =>
  v === true ? <Check size={16} className="mx-auto text-ember" /> : v === false ? <Minus size={16} className="mx-auto text-smoke" /> : <span className="text-[13.5px] text-ash">{v}</span>;

export default function PricingPage() {
  return (
    <>
      <Section className="!pb-12 !pt-20 text-center">
        <div className="flex justify-center"><Eyebrow>Pricing</Eyebrow></div>
        <Display as="h1" className="mx-auto mt-6 max-w-4xl">Start free. Scale when the agents earn it.</Display>
        <Lead className="mx-auto mt-6 max-w-2xl">Every plan includes all four departments and the orchestrator. The only question is who runs the servers.</Lead>
      </Section>

      <section className="px-4 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-[26px] border p-8 ${p.featured ? "border-ember/50 bg-[linear-gradient(180deg,rgba(224,88,76,0.10),transparent_60%)] shadow-[0_30px_80px_-40px_rgba(224,88,76,0.6)]" : "border-white/[0.07] bg-coal-2"}`}
            >
              {p.featured && <span className="absolute right-6 top-6 rounded-full bg-ember px-3 py-1 font-mono text-[10.5px] uppercase tracking-wider text-white">Most popular</span>}
              <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-ash">{p.name}</p>
              <p className="mt-6 font-display text-[48px] font-semibold leading-none tracking-[-0.05em]">{p.price}</p>
              <p className="mt-2 text-[13px] text-smoke">{p.note}</p>
              <p className="mt-6 text-[15px] leading-relaxed text-ash">{p.body}</p>
              <a
                href={p.cta[1]}
                className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-3 text-[15px] font-semibold transition-colors ${p.featured ? "bg-ember text-white hover:bg-[#e8695e]" : "bg-paper-white text-coal hover:bg-white"}`}
              >
                {p.cta[0]}
              </a>
              <ul className="mt-8 space-y-3 border-t border-white/[0.07] pt-8">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[14.5px]">
                    <Check size={16} className="mt-0.5 shrink-0 text-ember" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Section>
        <Display as="h3">Compare plans</Display>
        <div className="mt-8 overflow-x-auto rounded-[22px] border border-white/[0.07]">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-white/[0.07] bg-coal-2">
                <th className="p-5 font-mono text-[11.5px] font-normal uppercase tracking-[0.16em] text-smoke">Feature</th>
                {PLANS.map((p) => <th key={p.name} className="p-5 text-center text-[14px] font-semibold">{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([f, ...vals]) => (
                <tr key={f} className="border-b border-white/[0.05] last:border-0">
                  <td className="p-5 text-[14.5px]">{f}</td>
                  {vals.map((v, i) => <td key={i} className="p-5 text-center">{cell(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section className="border-t border-white/[0.06] !pt-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          <Display>Pricing questions.</Display>
          <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[18px] font-medium">
                  {q}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 text-ash transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-ash">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      <CTA />
    </>
  );
}
