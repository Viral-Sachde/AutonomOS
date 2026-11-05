import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Mark from "./Mark";
import Reveal from "./Reveal";
import Swirl from "./Swirl";
import { DEPARTMENTS } from "@/lib/departments";

export { default as Reveal } from "./Reveal";
export const GITHUB = "https://github.com/Viral-Sachde/AutonomOS";

/** A plain small caption. Used sparingly. */
export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[13px] font-medium uppercase tracking-[0.12em] text-mist ${className}`}>{children}</p>;
}

/** Huge poster headline. With `rise`, each word slides up out of its line on load. */
export function Headline({ children, as = "h2", rise = false, className = "" }: { children: string; as?: "h1" | "h2"; rise?: boolean; className?: string }) {
  const Tag = as;
  const size = as === "h1" ? "text-[17vw] sm:text-[13vw] lg:text-[11.5vw]" : "text-[13vw] sm:text-[9vw] lg:text-[7.5vw]";
  return (
    <Tag className={`font-display font-bold uppercase leading-[0.84] tracking-[-0.055em] ${size} ${className}`}>
      {rise
        ? children.split(" ").map((w, i) => (
            <span key={i} className="mr-[0.18em] inline-block overflow-hidden pb-[0.06em] align-bottom last:mr-0">
              <span className="word-rise" style={{ animationDelay: `${120 + i * 90}ms` }}>{w}</span>
            </span>
          ))
        : children}
    </Tag>
  );
}

export function Button({ href, children, variant = "solid" }: { href: string; children: ReactNode; variant?: "solid" | "line" }) {
  const solid = variant === "solid";
  return (
    <a
      href={href}
      className={`group inline-flex items-center justify-between gap-6 px-6 py-4 text-[15px] font-semibold uppercase tracking-[0.06em] transition-colors ${
        solid ? "bg-cream text-black hover:bg-teal" : "border border-cream/40 text-cream hover:border-cream hover:bg-cream hover:text-black"
      }`}
    >
      {children}
      {solid ? <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /> : <ArrowUpRight size={18} />}
    </a>
  );
}

export function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const row = (k: string) => (
    <div className="flex shrink-0 items-center">
      {items.map((t, i) => (
        <span key={i} className="flex items-center">
          <span className="px-6 font-display text-[11vw] font-bold uppercase leading-none tracking-[-0.05em] md:text-[7vw]">{t}</span>
          <Mark size="6vw" shape="disc" id={`mq-${k}-${i}`} className="shrink-0" />
        </span>
      ))}
    </div>
  );
  return (
    <div className={`overflow-hidden py-5 ${className}`} aria-hidden>
      <div className="marquee flex w-max">{row("a")}{row("b")}</div>
    </div>
  );
}

/** Full-bleed swirl with one line and one button. Closes most pages. */
export function CTA({ seed = 14, line = "Hand it a goal" }: { seed?: number; line?: string }) {
  return (
    <section className="relative h-[90svh] min-h-[560px] overflow-hidden bg-black">
      <div className="absolute inset-0"><Swirl seed={seed} scale={1.6} /></div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#000_0%,transparent_25%,transparent_60%,rgba(0,0,0,0.9)_100%)]" />
      <div className="pointer-events-none relative flex h-full flex-col justify-end px-4 pb-12 md:px-8">
        <Reveal><Headline>{line}</Headline></Reveal>
        <div className="pointer-events-auto mt-8"><Button href="/dashboard#command">Start free</Button></div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const links: [string, string][] = [
    ["Product", "/product"],
    ...DEPARTMENTS.map((d) => [d.name, `/departments/${d.id}`] as [string, string]),
    ["Pricing", "/pricing"],
    ["Brand", "/brand"],
    ["GitHub", GITHUB],
  ];
  return (
    <footer className="bg-black px-4 pb-8 pt-16 md:px-8">
      <nav className="flex flex-wrap gap-x-8 gap-y-3 text-[15px] text-mist">
        {links.map(([l, h]) => <a key={l} href={h} className="hover:text-cream">{l}</a>)}
      </nav>
      <div className="mt-16 flex items-end gap-[2vw]">
        <Mark size="13vw" id="foot-mark" className="shrink-0" />
        <p className="font-display text-[13.5vw] font-bold leading-[0.78] tracking-[-0.065em] text-cream">autonomOS</p>
      </div>
      <p className="mt-6 text-[12px] text-dusk">© {new Date().getFullYear()} AutonomOS. Sample data throughout.</p>
    </footer>
  );
}
