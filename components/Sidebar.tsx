"use client";

import {
  LayoutDashboard, Sparkles, Clock, Lightbulb, Bot, DollarSign, Calendar, CalendarClock,
  Wand2, Handshake, Radar, Workflow, ExternalLink,
} from "lucide-react";

export type Tab =
  | "dashboard" | "command"
  | "agents" | "generate" | "queue" | "schedule" | "creatives" | "improvements"
  | "sales" | "intelligence" | "operations"
  | "usage";

export const TABS: Tab[] = [
  "dashboard", "command", "agents", "generate", "queue", "schedule", "creatives", "improvements",
  "sales", "intelligence", "operations", "usage",
];

interface SidebarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  stats: {
    pending: number;
    improvements: number;
    agents: number;
  };
}

type Item = { id: Tab; label: string; icon: typeof LayoutDashboard };

const groups: { label: string; color?: string; items: Item[] }[] = [
  {
    label: "orchestrator",
    color: "#7c5cff",
    items: [
      { id: "dashboard", label: "overview", icon: LayoutDashboard },
      { id: "command", label: "command", icon: Wand2 },
    ],
  },
  {
    label: "marketing",
    color: "#ff6a3d",
    items: [
      { id: "agents", label: "agents", icon: Bot },
      { id: "generate", label: "generate", icon: Sparkles },
      { id: "queue", label: "review queue", icon: Clock },
      { id: "schedule", label: "schedule", icon: Calendar },
      { id: "creatives", label: "creatives", icon: CalendarClock },
      { id: "improvements", label: "improvements", icon: Lightbulb },
    ],
  },
  { label: "sales", color: "#16c47f", items: [{ id: "sales", label: "pipeline", icon: Handshake }] },
  { label: "intelligence", color: "#3b82f6", items: [{ id: "intelligence", label: "radar", icon: Radar }] },
  { label: "operations", color: "#f5b000", items: [{ id: "operations", label: "board", icon: Workflow }] },
  { label: "system", items: [{ id: "usage", label: "credits", icon: DollarSign }] },
];

const flat = groups.flatMap((g) => g.items.map((i) => ({ ...i, color: g.color })));

export default function Sidebar({ active, onChange, stats }: SidebarProps) {
  const badgeFor = (id: Tab) =>
    id === "queue" ? stats.pending : id === "improvements" ? stats.improvements : id === "agents" ? stats.agents : 0;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r border-gold/10 bg-ink-black/80 backdrop-blur-sm md:flex">
        <a href="/" className="flex items-center gap-3 border-b border-gold/10 p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.svg" alt="" width={36} height={36} className="rounded-[10px] ring-1 ring-white/10" />
          <div>
            <p className="text-[17px] font-bold leading-none tracking-tight text-champagne">
              Autonom<span className="text-gold">OS</span>
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[1.5px] text-cool-steel">company orchestration</p>
          </div>
        </a>

        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {groups.map((g) => (
            <div key={g.label} className="mb-2">
              <p className="flex items-center gap-2 px-5 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[2px] text-cool-steel/80">
                {g.color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: g.color }} />}
                {g.label}
              </p>
              {g.items.map((item) => {
                const Icon = item.icon;
                const badge = badgeFor(item.id);
                const on = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onChange(item.id)}
                    className={`mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all ${
                      on ? "bg-gold/12 text-champagne" : "text-cool-steel hover:bg-gold/5 hover:text-champagne"
                    }`}
                  >
                    <Icon size={16} style={on && g.color ? { color: g.color } : undefined} />
                    <span>{item.label}</span>
                    {badge > 0 && (
                      <span className="ml-auto min-w-[20px] rounded-full bg-strawberry-red px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-gold/10 p-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[1.5px] text-cool-steel">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald" />
            {stats.agents + 12} agents online
          </div>
          <a href="/brand" className="flex items-center gap-1.5 text-[11px] text-cool-steel hover:text-champagne">
            brand kit <ExternalLink size={11} />
          </a>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto border-t border-gold/10 bg-ink-black/95 backdrop-blur-md md:hidden">
        {flat.map((item) => {
          const Icon = item.icon;
          const badge = badgeFor(item.id);
          const on = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative flex min-w-[76px] flex-1 shrink-0 flex-col items-center gap-1 py-3 transition-all ${on ? "text-champagne" : "text-cool-steel"}`}
            >
              <Icon size={20} style={on && item.color ? { color: item.color } : undefined} />
              <span className="text-[9px] uppercase tracking-wider">{item.label.split(" ")[0]}</span>
              {badge > 0 && (
                <span className="absolute right-1/4 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-strawberry-red text-[8px] font-bold text-white">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
