"use client";

import { LayoutDashboard, Sparkles, Clock, Lightbulb, Bot, DollarSign, Calendar, CalendarClock } from "lucide-react";

type Tab = "dashboard" | "agents" | "generate" | "queue" | "schedule" | "creatives" | "improvements" | "usage";

interface SidebarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  stats: {
    pending: number;
    improvements: number;
    agents: number;
  };
}

const navItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "dashboard", icon: LayoutDashboard },
  { id: "agents", label: "agents", icon: Bot },
  { id: "generate", label: "generate", icon: Sparkles },
  { id: "queue", label: "review queue", icon: Clock },
  { id: "schedule", label: "schedule", icon: Calendar },
  { id: "creatives", label: "creatives", icon: CalendarClock },
  { id: "improvements", label: "improvements", icon: Lightbulb },
  { id: "usage", label: "credits", icon: DollarSign },
];

export default function Sidebar({ active, onChange, stats }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gold/10 bg-ink-black/60 backdrop-blur-sm">
        <div className="p-6 border-b border-gold/10">
          <h1 className="font-serif italic text-2xl text-champagne leading-tight">
            AutonomOS
          </h1>
          <p className="text-[11px] tracking-[2px] uppercase text-cool-steel mt-2">
            AI company orchestration platform
          </p>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const badge =
              item.id === "queue" ? stats.pending :
              item.id === "improvements" ? stats.improvements :
              item.id === "agents" ? stats.agents :
              0;

            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-sm tracking-wide transition-all ${
                  active === item.id
                    ? "bg-gold/12 text-gold border-r-2 border-gold"
                    : "text-cool-steel hover:text-champagne hover:bg-gold/5"
                }`}
              >
                <Icon size={18} />
                <span className="lowercase">{item.label}</span>
                {badge > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-strawberry-red text-champagne px-1.5 py-0.5 rounded-sm min-w-[20px] text-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gold/10">
          <div className="flex items-center gap-2 text-[10px] tracking-[1.5px] uppercase text-cool-steel">
            <div className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
            {stats.agents} agents active
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto bg-ink-black/95 backdrop-blur-md border-t border-gold/10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const badge =
            item.id === "queue" ? stats.pending :
            item.id === "improvements" ? stats.improvements :
            item.id === "agents" ? stats.agents :
            0;

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex-1 shrink-0 min-w-[76px] flex flex-col items-center gap-1 py-3 relative transition-all ${
                active === item.id ? "text-gold" : "text-cool-steel"
              }`}
            >
              <Icon size={20} />
              <span className="text-[9px] tracking-wider uppercase">{item.label.split(" ")[0]}</span>
              {badge > 0 && (
                <span className="absolute top-1.5 right-1/4 text-[8px] font-bold bg-strawberry-red text-champagne w-4 h-4 rounded-full flex items-center justify-center">
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
