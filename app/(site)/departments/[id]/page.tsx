import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Swirl from "@/components/site/Swirl";
import { DeptWidget } from "@/components/site/demos";
import { Button, CTA, Headline, Marquee, Reveal } from "@/components/site/ui";
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
  const next = DEPARTMENTS[(i + 1) % 4];

  return (
    <>
      <section className="relative h-[85svh] min-h-[560px] overflow-hidden bg-black">
        <div className="absolute inset-0"><Swirl seed={SEEDS[d.id]} scale={1.6} accent={d.color} /></div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.8)_45%,#000_75%)]" />
        <div className="pointer-events-none relative flex h-full flex-col justify-end px-4 pb-10 md:px-8">
          <div className="pointer-events-auto mb-6 flex flex-wrap">
            {DEPARTMENTS.map((x) => (
              <a key={x.id} href={`/departments/${x.id}`} className={`px-3 py-2 text-[13px] font-semibold uppercase tracking-[0.08em] ${x.id === d.id ? "text-black" : "text-cream/70 hover:text-cream"}`} style={x.id === d.id ? { background: x.color } : undefined}>
                {x.name}
              </a>
            ))}
          </div>
          <Headline as="h1" rise>{d.name}</Headline>
        </div>
      </section>

      <div style={{ background: d.color }} className="text-black"><Marquee items={d.blurb.split(", ")} /></div>

      <section className="bg-black px-4 py-20 md:px-8 md:py-28">
        <Reveal><DeptWidget id={d.id} /></Reveal>
      </section>

      <section className="bg-black">
        {d.agents.map((a, k) => (
          <Reveal key={a.id} delay={k * 80}>
            <div className="group grid gap-2 border-t border-cream/15 px-4 py-8 md:grid-cols-[1.3fr_1fr] md:items-end md:px-8" style={{ ["--c" as string]: d.color }}>
              <p className="font-display text-[11vw] font-bold uppercase leading-[0.85] tracking-[-0.055em] transition-colors group-hover:text-[var(--c)] md:text-[6vw]">{a.name}</p>
              <p className="text-[17px] text-mist md:text-right md:text-[19px]">{a.role}</p>
            </div>
          </Reveal>
        ))}
        <div className="border-t border-cream/15 px-4 py-10 md:px-8">
          <Button href={`/dashboard#${d.id === "marketing" ? "agents" : d.id}`}>Open {d.name}</Button>
        </div>
      </section>

      <a href={`/departments/${next.id}`} className="group block px-4 py-16 text-black md:px-8 md:py-24" style={{ background: next.color }}>
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em]">Next</p>
        <p className="flex items-center gap-4 font-display text-[15vw] font-bold uppercase leading-[0.8] tracking-[-0.06em] md:text-[10vw]">
          {next.name} <ArrowRight className="h-[8vw] w-[8vw] shrink-0 transition-transform group-hover:translate-x-4" />
        </p>
      </a>

      <CTA />
    </>
  );
}
