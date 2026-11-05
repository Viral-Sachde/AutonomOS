import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Wordmark } from "./Mark";
import Swirl from "./Swirl";
import { DEPARTMENTS } from "@/lib/departments";

export const GITHUB = "https://github.com/Viral-Sachde/AutonomOS";

/** Small mono label. The site leans on these instead of paragraphs. */
export function Label({ children, color = "#4fa89b" }: { children: ReactNode; color?: string }) {
  return (
    <p className="inline-flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.18em] text-mist">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </p>
  );
}

export function Headline({ children, as = "h2", className = "" }: { children: ReactNode; as?: "h1" | "h2"; className?: string }) {
  const Tag = as;
  const size = as === "h1" ? "text-[52px] leading-[0.95] sm:text-[80px] lg:text-[112px]" : "text-[38px] leading-[1] sm:text-[52px] lg:text-[64px]";
  return <Tag className={`font-display font-semibold tracking-[-0.05em] text-balance ${size} ${className}`}>{children}</Tag>;
}

export function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="group inline-flex items-center justify-center gap-2 rounded-full bg-cream px-6 py-3.5 text-[15px] font-semibold text-night transition-colors hover:bg-star">
      {children}
      <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}

export function GhostButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="inline-flex items-center justify-center gap-2 rounded-full border border-cream/20 bg-night/40 px-6 py-3.5 text-[15px] font-semibold text-cream backdrop-blur transition-colors hover:border-cream/40">
      {children}
      <ArrowUpRight size={16} />
    </a>
  );
}

export function Section({ children, id, className = "" }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-20 px-4 py-20 md:px-8 md:py-28 ${className}`}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

export function Frame({ children, url }: { children: ReactNode; url?: string }) {
  return (
    <div className="rounded-[26px] border border-cream/10 bg-cream/[0.03] p-1.5 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)] md:p-2">
      <div className="overflow-hidden rounded-[20px] border border-cream/[0.07] bg-night">
        {url && (
          <div className="flex items-center gap-2 border-b border-cream/[0.07] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
            <span className="ml-3 truncate font-mono text-[11px] text-dusk">{url}</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** A swirl band with one line and one button. Closes most pages. */
export function CTA({ seed = 14, line = "Hand it a goal." }: { seed?: number; line?: string }) {
  return (
    <section className="px-4 pb-20 md:px-8 md:pb-28">
      <div className="relative mx-auto h-[420px] max-w-7xl overflow-hidden rounded-[32px] bg-night md:h-[480px]">
        <div className="absolute inset-0"><Swirl seed={seed} scale={1.6} /></div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,rgba(18,24,39,0.85),rgba(18,24,39,0.2))]" />
        <div className="pointer-events-none relative flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
          <Headline>{line}</Headline>
          <div className="pointer-events-auto"><PrimaryButton href="/dashboard#command">Start free</PrimaryButton></div>
        </div>
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
    <footer className="border-t border-cream/[0.07] px-4 py-12 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <Wordmark size={18} id="wm-foot" />
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-mist">
          {links.map(([l, h]) => <a key={l} href={h} className="hover:text-cream">{l}</a>)}
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-7xl font-mono text-[11.5px] text-dusk">© {new Date().getFullYear()} AutonomOS · sample data</p>
    </footer>
  );
}
