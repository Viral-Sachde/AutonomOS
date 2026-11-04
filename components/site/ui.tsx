import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Ring, { Wordmark } from "./Ring";
import { DEPARTMENTS } from "@/lib/departments";

export const GITHUB = "https://github.com/Viral-Sachde/AutonomOS";

export function Eyebrow({ children, color = "#e0584c" }: { children: ReactNode; color?: string }) {
  return (
    <p className="inline-flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.16em] text-ash">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </p>
  );
}

export function Display({ children, as = "h2", className = "" }: { children: ReactNode; as?: "h1" | "h2" | "h3"; className?: string }) {
  const Tag = as;
  const size =
    as === "h1"
      ? "text-[46px] leading-[0.98] sm:text-[64px] lg:text-[88px]"
      : as === "h2"
        ? "text-[36px] leading-[1.02] sm:text-[48px] lg:text-[60px]"
        : "text-[26px] leading-[1.1] sm:text-[30px]";
  return <Tag className={`font-display font-semibold tracking-[-0.045em] text-balance ${size} ${className}`}>{children}</Tag>;
}

export function Lead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[17px] leading-[1.6] text-ash sm:text-[19px] text-pretty ${className}`}>{children}</p>;
}

export function Section({ children, id, className = "" }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-20 px-4 py-24 md:px-8 md:py-32 ${className}`}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

export function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center justify-center gap-2 rounded-full bg-ember px-6 py-3.5 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_30px_-10px_rgba(224,88,76,0.7)] transition-colors hover:bg-[#e8695e]"
    >
      {children}
      <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}

export function GhostButton({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-6 py-3.5 text-[15px] font-semibold text-paper-white transition-colors hover:border-white/25 hover:bg-white/[0.04]"
    >
      {children}
      {external && <ArrowUpRight size={16} />}
    </a>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[22px] border border-white/[0.07] bg-coal-2 ${className}`}>{children}</div>;
}

export function Frame({ children, url = "app.autonomos/dashboard" }: { children: ReactNode; url?: string }) {
  return (
    <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-1.5 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)] md:p-2">
      <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#0f0e0d]">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-3 truncate rounded-md bg-white/[0.05] px-3 py-1 font-mono text-[11px] text-smoke">{url}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CTA() {
  return (
    <section className="px-4 pb-24 md:px-8 md:pb-32">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-white/[0.07] bg-coal-2 px-6 py-20 text-center md:py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 opacity-[0.12]">
          <Ring size="100%" lit id="cta-ring" className="ring-breathe" />
        </div>
        <div className="relative">
          <Display className="mx-auto max-w-3xl">Give your company a second shift.</Display>
          <Lead className="mx-auto mt-5 max-w-xl">
            Open the app, hand the orchestrator a goal and watch four departments get to work. Free, in demo mode, in under a minute.
          </Lead>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryButton href="/dashboard#command">Start in demo mode</PrimaryButton>
            <GhostButton href={GITHUB} external>Read the source</GhostButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const cols = [
    { title: "Product", links: [["Overview", "/product"], ["Pricing", "/pricing"], ["Open the app", "/dashboard"], ["Sign in", "/login"]] },
    { title: "Departments", links: DEPARTMENTS.map((d) => [d.name, `/departments/${d.id}`]) },
    { title: "Resources", links: [["Brand guidelines", "/brand"], ["GitHub", GITHUB], ["Logo files", "/brand#downloads"]] },
  ];
  return (
    <footer className="border-t border-white/[0.06] px-4 pb-10 pt-16 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark size={20} />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-ash">
              The operating system for autonomous companies. Plan, delegate, coordinate, track.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-smoke">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-[14px] text-ash transition-colors hover:text-paper-white">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-20 select-none overflow-hidden">
          <p className="font-display text-[22vw] font-bold leading-[0.8] tracking-[-0.07em] text-white/[0.035] md:text-[19vw] lg:text-[240px]">
            autonomOS
          </p>
        </div>
        <div className="mt-6 flex flex-col justify-between gap-3 border-t border-white/[0.06] pt-6 text-[12.5px] text-smoke sm:flex-row">
          <p>© {new Date().getFullYear()} AutonomOS. Product figures shown are sample data.</p>
          <p className="font-mono">Plan · Delegate · Coordinate · Track</p>
        </div>
      </div>
    </footer>
  );
}
