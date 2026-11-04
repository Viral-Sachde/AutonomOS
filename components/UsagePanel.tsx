"use client";

import { useState, useEffect } from "react";
import { DollarSign, Zap, ArrowDown, ArrowUp, Activity, Loader2 } from "lucide-react";

interface UsageSummary {
  totalCost: number;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byAgent: Record<string, { calls: number; cost: number }>;
  byModel: Record<string, { calls: number; cost: number; inputTokens: number; outputTokens: number }>;
  byDay: { date: string; cost: number; calls: number }[];
  entries: {
    id: string;
    agentId: string;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    createdAt: string;
  }[];
}

const agentLabels: Record<string, string> = {
  "content-writer": "content writer",
  "hashtag-strategist": "hashtag strategist",
  "story-generator": "story generator",
  "analytics-reporter": "analytics reporter",
  "competitor-scout": "competitor scout",
  "code-improver": "game improver",
  "concept-polisher": "concept polisher",
  "trend-rider": "trend rider",
  "content-calendar": "content calendar",
  "illustration-studio": "illustration studio",
  manual: "manual generate",
};

function formatCost(usd: number): string {
  if (usd < 0.001) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function UsagePanel() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/usage?days=${days}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => console.error("Usage load error:", e))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  if (!data || data.totalCalls === 0) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <p className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-2">credits & costs</p>
          <h1 className="font-serif italic text-3xl text-champagne">usage tracker.</h1>
        </div>
        <div className="text-center py-16 border border-gold/10 bg-twilight-indigo/20">
          <DollarSign size={32} className="mx-auto text-cool-steel/50 mb-3" />
          <p className="text-sm text-cool-steel">no AI calls recorded yet.</p>
          <p className="text-xs text-cool-steel/60 mt-1">
            generate some content and usage will appear here.
          </p>
        </div>
      </div>
    );
  }

  const budget = 5.0;
  const remaining = Math.max(0, budget - data.totalCost);
  const pct = Math.min(100, (data.totalCost / budget) * 100);

  const sortedAgents = Object.entries(data.byAgent).sort(
    ([, a], [, b]) => (b as { cost: number }).cost - (a as { cost: number }).cost,
  );
  const sortedModels = Object.entries(data.byModel).sort(
    ([, a], [, b]) => (b as { cost: number }).cost - (a as { cost: number }).cost,
  );

  const maxDayCost = Math.max(...data.byDay.map((d) => d.cost), 0.001);

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-2">
            credits & costs
          </p>
          <h1 className="font-serif italic text-3xl text-champagne">usage tracker.</h1>
          <p className="text-sm text-cool-steel mt-2">
            every AI call, what it cost, and which agent spent it.
          </p>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-[11px] tracking-wider uppercase transition-colors ${
                days === d
                  ? "bg-gold/15 text-gold border border-gold/30"
                  : "text-cool-steel border border-gold/10 hover:text-champagne"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Budget Bar */}
      <div className="border border-gold/10 bg-twilight-indigo/30 p-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[10px] tracking-[2px] uppercase text-cool-steel">
              monthly budget
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-serif italic text-4xl text-champagne">
                {formatCost(data.totalCost)}
              </span>
              <span className="text-sm text-cool-steel">/ ${budget.toFixed(2)}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-[2px] uppercase text-cool-steel">remaining</p>
            <span
              className={`font-serif italic text-2xl ${
                remaining < 1 ? "text-strawberry-red" : "text-emerald"
              }`}
            >
              {formatCost(remaining)}
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-ink-black/60 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              pct > 90
                ? "bg-strawberry-red"
                : pct > 70
                  ? "bg-gold"
                  : "bg-emerald"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[9px] text-cool-steel/60 mt-2">
          {pct.toFixed(1)}% of ${budget.toFixed(2)} monthly budget used ({days}-day window)
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "total calls",
            value: String(data.totalCalls),
            icon: Zap,
            color: "text-gold",
          },
          {
            label: "avg cost/call",
            value: formatCost(data.totalCost / data.totalCalls),
            icon: Activity,
            color: "text-emerald",
          },
          {
            label: "input tokens",
            value: formatTokens(data.totalInputTokens),
            icon: ArrowUp,
            color: "text-cool-steel",
          },
          {
            label: "output tokens",
            value: formatTokens(data.totalOutputTokens),
            icon: ArrowDown,
            color: "text-strawberry-red",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-gold/10 bg-twilight-indigo/30 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} className={stat.color} />
              <span className="text-[10px] tracking-wider uppercase text-cool-steel">
                {stat.label}
              </span>
            </div>
            <span className="font-serif italic text-2xl text-champagne">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Daily Spend Chart */}
      {data.byDay.length > 1 && (
        <div className="border border-gold/10 bg-twilight-indigo/20 p-6">
          <h2 className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-4">
            daily spend
          </h2>
          <div className="flex items-end gap-1 h-32">
            {data.byDay.slice(-30).map((day) => {
              const h = Math.max(4, (day.cost / maxDayCost) * 100);
              return (
                <div
                  key={day.date}
                  className="flex-1 group relative"
                >
                  <div
                    className="w-full bg-gold/40 hover:bg-gold/70 transition-colors rounded-t-sm"
                    style={{ height: `${h}%` }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-ink-black border border-gold/20 p-2 text-[9px] text-champagne whitespace-nowrap z-10">
                    <p className="font-bold">{day.date}</p>
                    <p>{formatCost(day.cost)}</p>
                    <p>{day.calls} calls</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[8px] text-cool-steel/50">
            <span>{data.byDay[0]?.date}</span>
            <span>{data.byDay[data.byDay.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Cost by Agent */}
      <div className="border border-gold/10 bg-twilight-indigo/20 p-6">
        <h2 className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-4">
          cost by agent
        </h2>
        <div className="space-y-3">
          {sortedAgents.map(([agentId, info]) => {
            const agentPct =
              data.totalCost > 0 ? (info.cost / data.totalCost) * 100 : 0;
            return (
              <div key={agentId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-champagne lowercase">
                    {agentLabels[agentId] || agentId}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-cool-steel">
                      {info.calls} calls
                    </span>
                    <span className="text-xs text-gold font-semibold">
                      {formatCost(info.cost)}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-ink-black/60 overflow-hidden">
                  <div
                    className="h-full bg-gold/50"
                    style={{ width: `${agentPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost by Model */}
      <div className="border border-gold/10 bg-twilight-indigo/20 p-6">
        <h2 className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-4">
          cost by model
        </h2>
        <div className="space-y-3">
          {sortedModels.map(([model, info]) => (
            <div
              key={model}
              className="flex items-center justify-between py-2 border-b border-gold/5 last:border-0"
            >
              <div>
                <p className="text-xs text-champagne font-mono">{model}</p>
                <p className="text-[9px] text-cool-steel mt-0.5">
                  {formatTokens(info.inputTokens)} in / {formatTokens(info.outputTokens)} out
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gold font-semibold">
                  {formatCost(info.cost)}
                </p>
                <p className="text-[9px] text-cool-steel">{info.calls} calls</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Calls */}
      <div className="border border-gold/10 bg-twilight-indigo/20 p-6">
        <h2 className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-4">
          recent calls
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] tracking-wider uppercase text-cool-steel border-b border-gold/10">
                <th className="text-left py-2 pr-4">time</th>
                <th className="text-left py-2 pr-4">agent</th>
                <th className="text-left py-2 pr-4">model</th>
                <th className="text-right py-2 pr-4">in</th>
                <th className="text-right py-2 pr-4">out</th>
                <th className="text-right py-2">cost</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.slice(0, 25).map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-gold/5 last:border-0"
                >
                  <td className="py-2 pr-4 text-cool-steel whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2 pr-4 text-champagne lowercase">
                    {agentLabels[entry.agentId] || entry.agentId}
                  </td>
                  <td className="py-2 pr-4 text-cool-steel font-mono text-[10px]">
                    {entry.model}
                  </td>
                  <td className="py-2 pr-4 text-right text-cool-steel tabular-nums">
                    {formatTokens(entry.inputTokens)}
                  </td>
                  <td className="py-2 pr-4 text-right text-cool-steel tabular-nums">
                    {formatTokens(entry.outputTokens)}
                  </td>
                  <td className="py-2 text-right text-gold font-semibold tabular-nums">
                    {formatCost(entry.costUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
