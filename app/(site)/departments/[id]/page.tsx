import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Swirl from "@/components/site/Swirl";
import Mark from "@/components/site/Mark";
import { DeptWidget } from "@/components/site/demos";
import { CTA, Headline, Label, PrimaryButton, Section } from "@/components/site/ui";
import { DEPARTMENTS } from "@/lib/departments";

export function generateStaticParams() {
  return DEPARTMENTS.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const d = DEPARTMENTS.find((x) => x.id === id);
  return d ? { title: d.name, description: `${d.name}: ${d.blurb.toLowerCase()}.` } : {};
}

const SEEDS = { marketing: 14, sales: 10, intelligence: 3, operations: 1 } as const;

export default async function DepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const i = DEPARTMENTS.findIndex((x) => x.id === id);
  if (i < 0) notFound();
  const d = DEPARTMENTS[i];
  const prev = DEPARTMENTS[(i + 3) % 4];
  const next = DEPARTMENTS[(i + 1) % 4];

  return (
    <>
      <section className="relative h-[72svh] min-h-[520px] overflow-hidden bg-night">
        <div className="absolute inset-0"><Swirl seed={SEEDS[d.id]} scale={1.6} accent={d.color} /></div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,24,39,0.4)_0%,transparent_35%,rgba(18,24,39,1)_100%)]" />
        <div className="pointer-events-none relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-14 md:px-8">
          <div className="pointer-events-auto mb-8 flex flex-wrap gap-2">
            {DEPARTMENTS.map((x) => (
              <a key={x.id} href={`/departments/${x.id}`} className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] backdrop-blur ${x.id === d.id ? "border-cream/40 bg-cream/10 text-cream" : "border-cream/15 bg-night/40 text-mist hover:text-cream"}`}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: x.color }} /> {x.name}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Mark size={56} accent={d.color} id={`dm-${d.id}`} />
            <div className="rounded-full bg-night/70 px-3.5 py-1.5 backdrop-blur"><Label color={d.color}>{d.blurb}</Label></div>
          </div>
          <Headline as="h1" className="mt-4">{d.name}</Headline>
        </div>
      </section>

      <Section>
        <div className="rounded-[28px] border border-cream/[0.08] bg-night-2 p-5 md:p-8"><DeptWidget id={d.id} /></div>
      </Section>

      <Section className="!pt-0">
        <Label color={d.color}>Agents</Label>
        <div className="mt-8 grid gap-px overflow-hidden rounded-[24px] border border-cream/[0.08] bg-cream/[0.08] sm:grid-cols-2 lg:grid-cols-4">
          {d.agents.map((a) => (
            <div key={a.id} className="bg-night p-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ background: d.color }} />
                <span className="relative h-2 w-2 rounded-full" style={{ background: d.color }} />
              </span>
              <p className="mt-10 font-display text-[22px] font-semibold tracking-[-0.035em]">{a.name}</p>
              <p className="mt-1.5 text-[14px] text-mist">{a.role}</p>
            </div>
          ))}
        </div>
        <div className="mt-10"><PrimaryButton href={`/dashboard#${d.id === "marketing" ? "agents" : d.id}`}>Open {d.name.toLowerCase()}</PrimaryButton></div>
      </Section>

      <section className="px-4 pb-6 md:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3">
          <a href={`/departments/${prev.id}`} className="rounded-[22px] border border-cream/[0.08] p-6 hover:border-cream/20">
            <ArrowLeft size={16} className="text-dusk" />
            <p className="mt-3 font-display text-[24px] font-semibold tracking-[-0.04em] md:text-[30px]">{prev.name}</p>
          </a>
          <a href={`/departments/${next.id}`} className="rounded-[22px] border border-cream/[0.08] p-6 text-right hover:border-cream/20">
            <ArrowRight size={16} className="ml-auto text-dusk" />
            <p className="mt-3 font-display text-[24px] font-semibold tracking-[-0.04em] md:text-[30px]">{next.name}</p>
          </a>
        </div>
      </section>

      <CTA />
    </>
  );
}
