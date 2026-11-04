"use client";

import type { ReactNode } from "react";
import { DEPARTMENTS, dept, type DeptId } from "@/lib/departments";

export function agentName(id: string): string {
  for (const d of DEPARTMENTS) {
    const a = d.agents.find((x) => x.id === id);
    if (a) return a.name;
  }
  return id.replace(/^[a-z]+\./, "").replace(/-/g, " ");
}

export function DemoBadge() {
  return (
    <span
      title="Dummy data and templates only. No model credits are spent. Set ORCHESTRATOR_AI=on to use a real model."
      className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-gold"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
      demo data
    </span>
  );
}

export function DeptChip({ id, small }: { id: DeptId; small?: boolean }) {
  const d = dept(id);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"}`}
      style={{ borderColor: `${d.color}55`, color: d.color, background: `${d.color}14` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} />
      {d.name}
    </span>
  );
}

export function DeptHeader({ id, children }: { id: DeptId; children?: ReactNode }) {
  const d = dept(id);
  return (
    <div className="rise relative overflow-hidden rounded-2xl border border-gold/10 bg-twilight-indigo/40 p-6 md:p-8">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{ background: d.color }}
      />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.mark} alt="" width={52} height={52} className="rounded-xl" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-cool-steel">department</p>
            <h1 className="font-serif text-3xl text-champagne md:text-4xl">{d.name}</h1>
            <p className="mt-1 text-sm text-cool-steel">{d.blurb}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DemoBadge />
          {children}
        </div>
      </div>
      <div className="relative mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {d.agents.map((a) => (
          <div key={a.id} className="rounded-xl border border-gold/10 bg-ink-black/50 p-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: d.color }} />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: d.color }} />
              </span>
              <span className="text-sm font-medium text-champagne">{a.name}</span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-cool-steel">{a.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rise rounded-2xl border border-gold/10 bg-twilight-indigo/30 p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[2px] text-cool-steel">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-gold/10 bg-twilight-indigo/30 p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-cool-steel">{label}</p>
      <p className="mt-1 font-serif text-3xl text-champagne" style={color ? { color } : undefined}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-cool-steel">{hint}</p>}
    </div>
  );
}

export function Button({
  children, onClick, disabled, variant = "primary", type = "button",
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: "primary" | "ghost"; type?: "button" | "submit" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50";
  const styles = variant === "primary"
    ? "bg-champagne text-ink-black hover:bg-white"
    : "border border-gold/20 text-champagne hover:bg-gold/10";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

export const inputClass =
  "w-full rounded-lg border border-gold/15 bg-ink-black/60 px-3 py-2.5 text-sm text-champagne placeholder:text-cool-steel/60 focus:border-gold/50 focus:outline-none";

export function money(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`;
}

export function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
