"use client";

import { useCallback, useEffect, useState } from "react";
import { AgentConfig, ContentItem, Improvement } from "@/lib/design-system";
import ContentCard from "./ContentCard";
import {
  Sparkles, Smartphone, Hash, BarChart3, Radar, Code2, Gem, TrendingUp,
  CalendarDays, Palette, Bot, Play, Loader2, Calendar, ChevronRight, ArrowLeft,
  CheckCircle2, AlertCircle, Power, Lightbulb, CopyCheck,
} from "lucide-react";

const iconMap: Record<string, typeof Sparkles> = {
  Sparkles, Smartphone, Hash, BarChart3, Radar, Code2, Gem, TrendingUp, CalendarDays, Palette,
};

/** Agent config joined with the persisted state the API returns. */
export interface AgentRow extends AgentConfig {
  lastRun?: string;
  lastCount?: number;
  lastError?: string;
  itemsGenerated: number;
}

interface RunOutcome {
  count: number;
  at: string;
  errors?: string[];
  duplicatesRejected?: { title: string; score: number; matchedTitle?: string }[];
}

const CATEGORIES = [
  { id: "content", label: "content agents", desc: "generate posts, stories, and media for your channels" },
  { id: "growth", label: "growth agents", desc: "research, analytics, and strategy to grow your audience" },
  { id: "dev", label: "dev agents", desc: "improve the game codebase and polish the concept" },
];

export default function AgentsPanel({
  onContentChanged,
}: {
  onContentChanged?: () => void;
}) {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [outcomes, setOutcomes] = useState<Record<string, RunOutcome>>({});
  const [ai, setAi] = useState<{ provider: string; model: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoPublish, setAutoPublish] = useState(true);

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data.agents || []);
      setAi(data.ai || null);
    } catch (e) {
      console.error("Could not load agents:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAgents();
    fetch("/api/settings/auto-publish")
      .then((r) => r.json())
      .then((d) => setAutoPublish(d.enabled ?? true))
      .catch((e) => console.error("Could not load auto-publish setting:", e));
  }, [loadAgents]);

  const toggleAutoPublish = useCallback(async (enabled: boolean) => {
    setAutoPublish(enabled);
    try {
      const res = await fetch("/api/settings/auto-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      console.error("Could not toggle auto-publish:", e);
      setAutoPublish(!enabled);
    }
  }, []);

  const runAgent = useCallback(
    async (agent: AgentRow, steer?: string, count?: number) => {
      setRunning((prev) => new Set([...prev, agent.id]));
      try {
        const res = await fetch(agent.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steer, count }),
        });
        const data = await res.json();
        setOutcomes((prev) => ({
          ...prev,
          [agent.id]: {
            count: data.count ?? 0,
            at: new Date().toISOString(),
            errors: data.errors?.length ? data.errors : undefined,
            duplicatesRejected: data.duplicatesRejected,
          },
        }));
        await loadAgents();
        onContentChanged?.();
      } catch (e: any) {
        setOutcomes((prev) => ({
          ...prev,
          [agent.id]: { count: 0, at: new Date().toISOString(), errors: [String(e)] },
        }));
      }
      setRunning((prev) => {
        const next = new Set(prev);
        next.delete(agent.id);
        return next;
      });
    },
    [loadAgents, onContentChanged]
  );

  const toggleAgent = useCallback(async (agent: AgentRow, enabled: boolean) => {
    // Optimistic: the switch should feel instant even though it commits to git.
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, enabled } : a)));
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agent.id, enabled }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      console.error("Could not toggle agent:", e);
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, enabled: !enabled } : a)));
    }
  }, []);

  if (selected) {
    const agent = agents.find((a) => a.id === selected);
    if (agent) {
      return (
        <AgentDetail
          agent={agent}
          running={running.has(agent.id)}
          outcome={outcomes[agent.id]}
          onBack={() => setSelected(null)}
          onRun={(steer, count) => runAgent(agent, steer, count)}
          onToggle={(enabled) => toggleAgent(agent, enabled)}
          onContentChanged={onContentChanged}
        />
      );
    }
  }

  const activeCount = agents.filter((a) => a.enabled).length;

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <p className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-2">agent fleet</p>
        <h1 className="font-serif italic text-3xl text-champagne">your agents.</h1>
        <p className="text-sm text-cool-steel mt-2">
          {agents.length} agents, {activeCount} switched on. click any agent to see its work,
          give it your own idea, or switch it off.
        </p>
        {ai && (
          <p className="text-[10px] text-cool-steel/60 mt-2 font-mono">
            model: {ai.provider === "none" ? "templates only (no api key, $0)" : `${ai.provider} / ${ai.model}`}
          </p>
        )}
      </div>

      <button
        onClick={() => agents.filter((a) => a.enabled).forEach((a) => runAgent(a))}
        disabled={running.size > 0 || loading}
        className="flex items-center gap-2 px-5 py-3 bg-champagne text-ink-black text-sm font-bold tracking-wider lowercase hover:bg-gold transition-colors disabled:opacity-50"
        style={{ boxShadow: "3px 3px 0 #8b7bff" }}
      >
        {running.size > 0 ? (
          <><Loader2 size={16} className="animate-spin" /> running {running.size} agents...</>
        ) : (
          <><Play size={16} /> run all enabled agents</>
        )}
      </button>

      {loading && <p className="text-xs text-cool-steel">loading agents...</p>}

      <div className="border border-gold/15 bg-ink-black/40 p-4 flex items-start gap-4">
        <ToggleSwitch on={autoPublish} onChange={toggleAutoPublish} />
        <div>
          <p className="text-sm text-champagne">
            auto-publish approved content {autoPublish ? "on" : "off"}
          </p>
          <p className="text-[11px] text-cool-steel mt-1">
            when on, approving a piece schedules it for the next peak window
            (12-2pm or 7-9pm IST) and the morning/midday crons publish it once
            it's due. when off, approved pieces wait for a manual publish.
          </p>
        </div>
      </div>

      {CATEGORIES.map((cat) => {
        const catAgents = agents.filter((a) => a.category === cat.id);
        if (catAgents.length === 0) return null;

        return (
          <div key={cat.id}>
            <div className="mb-4">
              <h2 className="text-[11px] tracking-[2px] uppercase text-cool-steel">{cat.label}</h2>
              <p className="text-[10px] text-cool-steel/60 mt-0.5">{cat.desc}</p>
            </div>

            <div className="space-y-3">
              {catAgents.map((agent) => {
                const Icon = iconMap[agent.icon] || Bot;
                const isRunning = running.has(agent.id);
                const outcome = outcomes[agent.id];

                return (
                  <div
                    key={agent.id}
                    className={`border border-gold/10 transition-all ${
                      agent.enabled
                        ? "bg-twilight-indigo/40 hover:bg-twilight-indigo/60"
                        : "bg-ink-black/40 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-4 p-4">
                      <button
                        onClick={() => setSelected(agent.id)}
                        className={`p-2.5 rounded-sm flex-shrink-0 ${agent.color}`}
                      >
                        <Icon size={20} />
                      </button>

                      <button
                        onClick={() => setSelected(agent.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-champagne lowercase">{agent.name}</h3>
                          <span
                            className={`text-[8px] tracking-widest uppercase px-1.5 py-0.5 ${
                              agent.enabled
                                ? "text-emerald bg-emerald/15"
                                : "text-cool-steel bg-cool-steel/15"
                            }`}
                          >
                            {agent.enabled ? "on" : "off"}
                          </span>
                        </div>
                        <p className="text-xs text-cool-steel mt-1 leading-relaxed line-clamp-2">
                          {agent.description}
                        </p>

                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                          <span className="flex items-center gap-1.5 text-[10px] text-cool-steel">
                            <Calendar size={11} className="text-cool-steel/60" />
                            {agent.enabled ? agent.cronHuman : "paused"}
                          </span>
                          {agent.itemsGenerated > 0 && (
                            <span className="text-[10px] text-gold">
                              {agent.itemsGenerated} items made
                            </span>
                          )}
                          {outcome && !outcome.errors && (
                            <span className="flex items-center gap-1.5 text-[10px] text-emerald">
                              <CheckCircle2 size={11} /> +{outcome.count} just now
                            </span>
                          )}
                          {outcome?.errors && (
                            <span className="flex items-center gap-1.5 text-[10px] text-strawberry-red">
                              <AlertCircle size={11} /> failed
                            </span>
                          )}
                        </div>
                      </button>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <ToggleSwitch
                          on={agent.enabled}
                          onChange={(v) => toggleAgent(agent, v)}
                        />
                        <button
                          onClick={() => runAgent(agent)}
                          disabled={isRunning}
                          className="flex items-center gap-1.5 px-3 py-2 border border-gold/20 text-[10px] tracking-wider uppercase text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
                        >
                          {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                          {isRunning ? "running" : "run"}
                        </button>
                        <ChevronRight size={16} className="text-cool-steel/40" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** One agent: its own output feed, its idea box, and its switch. */
function AgentDetail({
  agent, running, outcome, onBack, onRun, onToggle, onContentChanged,
}: {
  agent: AgentRow;
  running: boolean;
  outcome?: RunOutcome;
  onBack: () => void;
  onRun: (steer?: string, count?: number) => void;
  onToggle: (enabled: boolean) => void;
  onContentChanged?: () => void;
}) {
  const Icon = iconMap[agent.icon] || Bot;
  const [items, setItems] = useState<ContentItem[]>([]);
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [idea, setIdea] = useState("");
  // A hand-started story is nearly always one idea, so a manual run defaults to
  // a single frame. Scheduled runs keep producing a four frame sequence.
  const [frames, setFrames] = useState(1);
  const picksFrames = agent.id === "story-generator";
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isDevAgent = agent.category === "dev";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isDevAgent) {
        const res = await fetch("/api/improvements");
        const data = await res.json();
        setImprovements(data.improvements || []);
      } else {
        const res = await fetch(`/api/content?agentId=${encodeURIComponent(agent.id)}&months=6`);
        const data = await res.json();
        setItems(data.content || []);
      }
    } catch (e) {
      console.error("Could not load agent output:", e);
    }
    setLoading(false);
  }, [agent.id, isDevAgent]);

  useEffect(() => {
    load();
  }, [load, outcome]);

  const act = useCallback(
    async (id: string, action: string) => {
      setBusyId(id);
      await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      await load();
      onContentChanged?.();
      setBusyId(null);
    },
    [load, onContentChanged]
  );

  const rework = useCallback(
    async (id: string, action: "regenerate" | "alter", prompt?: string) => {
      setBusyId(id);
      await fetch("/api/alter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, prompt }),
      });
      await load();
      onContentChanged?.();
      setBusyId(null);
    },
    [load, onContentChanged]
  );

  const submitIdea = () => {
    onRun(idea.trim() || undefined, picksFrames ? frames : undefined);
    setIdea("");
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[11px] tracking-wider uppercase text-cool-steel hover:text-champagne transition-colors"
      >
        <ArrowLeft size={14} /> all agents
      </button>

      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-sm ${agent.color}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <h1 className="font-serif italic text-3xl text-champagne lowercase">{agent.name}.</h1>
          <p className="text-sm text-cool-steel mt-2 max-w-2xl">{agent.description}</p>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-[10px] text-cool-steel">
              <Calendar size={11} /> {agent.enabled ? agent.cronHuman : "paused - will not run on schedule"}
            </span>
            {agent.lastRun && (
              <span className="text-[10px] text-cool-steel">
                last run {new Date(agent.lastRun).toLocaleString()}
                {typeof agent.lastCount === "number" ? ` (${agent.lastCount} items)` : ""}
              </span>
            )}
          </div>
          {agent.lastError && (
            <p className="text-[10px] text-strawberry-red mt-2 flex items-center gap-1.5">
              <AlertCircle size={11} /> last error: {agent.lastError}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <ToggleSwitch on={agent.enabled} onChange={onToggle} />
          <span className="text-[9px] tracking-widest uppercase text-cool-steel">
            {agent.enabled ? "scheduled" : "paused"}
          </span>
        </div>
      </div>

      {/* Your idea, fed straight into this agent's prompt. */}
      <div className="border border-gold/15 bg-twilight-indigo/30 p-5">
        <h2 className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-1 flex items-center gap-2">
          <Lightbulb size={13} className="text-gold" /> your idea
        </h2>
        <p className="text-[11px] text-cool-steel/70 mb-3">
          drop a thought and this agent builds from it. leave it empty to let the agent pick.
        </p>

        {picksFrames && (
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-[10px] tracking-[2px] uppercase text-cool-steel">frames</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFrames(n)}
                  aria-pressed={frames === n}
                  className={`w-8 h-8 text-xs tabular-nums transition-colors ${
                    frames === n
                      ? "bg-gold/15 text-gold border border-gold/40"
                      : "text-cool-steel border border-gold/10 hover:text-champagne"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-cool-steel/60">
              {frames === 1 ? "one story, one screen" : `${frames} screens in one story`}
            </span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitIdea();
            }}
            rows={2}
            placeholder="a post about the moment everyone realises merlin gave himself away..."
            className="flex-1 bg-ink-black/60 border border-gold/20 px-3 py-2.5 text-xs text-champagne placeholder:text-cool-steel/50 focus:outline-none focus:border-gold/50 resize-none"
          />
          <button
            onClick={submitIdea}
            disabled={running}
            className="px-5 py-3 bg-champagne text-ink-black text-xs font-bold tracking-wider lowercase hover:bg-gold transition-colors disabled:opacity-50 whitespace-nowrap"
            style={{ boxShadow: "3px 3px 0 #8b7bff" }}
          >
            {running ? (
              <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> working</span>
            ) : (
              <span className="flex items-center gap-2"><Play size={14} /> generate</span>
            )}
          </button>
        </div>
      </div>

      {outcome?.duplicatesRejected && outcome.duplicatesRejected.length > 0 && (
        <div className="border border-gold/15 bg-gold/5 p-4">
          <h3 className="text-[10px] tracking-[2px] uppercase text-gold mb-2 flex items-center gap-2">
            <CopyCheck size={12} /> {outcome.duplicatesRejected.length} near-duplicate(s) dropped
          </h3>
          {outcome.duplicatesRejected.map((d, i) => (
            <p key={i} className="text-[11px] text-cool-steel">
              &ldquo;{d.title}&rdquo; matched &ldquo;{d.matchedTitle}&rdquo; ({Math.round(d.score * 100)}% similar)
            </p>
          ))}
        </div>
      )}

      {outcome?.errors && (
        <div className="border border-strawberry-red/30 bg-strawberry-red/5 p-4">
          {outcome.errors.map((e, i) => (
            <p key={i} className="text-[11px] text-strawberry-red">{e}</p>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-4">
          what this agent has made
        </h2>

        {loading ? (
          <p className="text-xs text-cool-steel">loading...</p>
        ) : isDevAgent ? (
          improvements.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {improvements.map((imp) => (
                <div key={imp.id} className="border border-gold/10 bg-twilight-indigo/40 p-4">
                  <h3 className="text-sm font-semibold text-champagne">{imp.title}</h3>
                  <p className="text-xs text-cool-steel mt-1">{imp.description}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[9px] uppercase tracking-wider text-gold">{imp.category}</span>
                    <span className="text-[9px] uppercase tracking-wider text-cool-steel">{imp.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                busy={busyId === item.id}
                onApprove={(id) => act(id, "approve")}
                onReject={(id) => act(id, "reject")}
                onRegenerate={(id) => rework(id, "regenerate")}
                onAlter={(id, p) => rework(id, "alter", p)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-14 border border-gold/10 bg-twilight-indigo/20">
      <Bot size={28} className="mx-auto text-cool-steel/40 mb-3" />
      <p className="text-sm text-cool-steel">nothing yet.</p>
      <p className="text-xs text-cool-steel/60 mt-1">
        hit generate above, or wait for the next scheduled run.
      </p>
    </div>
  );
}

function ToggleSwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={on ? "switch agent off" : "switch agent on"}
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        on ? "bg-emerald/70" : "bg-cool-steel/30"
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-champagne transition-all ${
          on ? "left-6" : "left-1"
        }`}
      />
      <Power
        size={9}
        className={`absolute top-1.5 ${on ? "left-2 text-champagne/80" : "right-1.5 text-cool-steel"}`}
      />
    </button>
  );
}
