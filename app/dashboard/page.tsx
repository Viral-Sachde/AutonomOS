"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar, { TABS, type Tab } from "@/components/Sidebar";
import CommandPanel from "@/components/CommandPanel";
import { useOrchestratorRunner } from "@/components/useOrchestratorRunner";
import SalesPanel from "@/components/SalesPanel";
import IntelligencePanel from "@/components/IntelligencePanel";
import OperationsPanel from "@/components/OperationsPanel";
import OrchestratorGraph from "@/components/OrchestratorGraph";
import { DEPARTMENTS, TOTAL_AGENTS } from "@/lib/departments";
import ContentCard from "@/components/ContentCard";
import ImprovementCard from "@/components/ImprovementCard";
import AgentsPanel from "@/components/AgentsPanel";
import UsagePanel from "@/components/UsagePanel";
import CreativesPanel from "@/components/CreativesPanel";
import SuggestInput from "@/components/SuggestInput";
import { ContentItem, Improvement, ContentType, DesignChoice, roles, themes, templateOptions, agentConfigs, AgentConfig } from "@/lib/design-system";
import {
  Sparkles, Film, Image, Layers, Clock, CheckCircle2,
  Send, BarChart3, Lightbulb, Loader2, Calendar,
  Target, Zap, ArrowRight, Bot, Smartphone, Hash, Radar, Code2, Gem,
  Play, Power, TrendingUp, CalendarDays, Palette, X, ExternalLink, AlertCircle, RefreshCw,
  Trash2, Dices, LayoutTemplate, ArrowLeft,
} from "lucide-react";


const iconMap: Record<string, typeof Sparkles> = {
  Sparkles, Smartphone, Hash, BarChart3, Radar, Code2, Gem, TrendingUp, CalendarDays, Palette,
};


function isTab(value: string): value is Tab {
  return (TABS as string[]).includes(value);
}

export default function MarketingDashboard() {
  const [tab, setTab] = useState<Tab>("dashboard");
  useOrchestratorRunner();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genType, setGenType] = useState<ContentType>("post");
  const [genTheme, setGenTheme] = useState("");
  const [genRole, setGenRole] = useState("");
  // Kept as text so the field can be cleared while typing. Parsed on submit.
  const [genDuration, setGenDuration] = useState("30");
  const [genFrames, setGenFrames] = useState("1");
  const [genIdea, setGenIdea] = useState("");
  const [genMode, setGenMode] = useState<"template" | "free">("template");
  const [genError, setGenError] = useState<string | null>(null);
  // Artwork direction is separate from how the copy is written (genMode above).
  const [genDesign, setGenDesign] = useState<DesignChoice["mode"]>("auto");
  const [genTemplate, setGenTemplate] = useState(templateOptions[0].id);
  const [genNotice, setGenNotice] = useState("");
  const [loadingImprovements, setLoadingImprovements] = useState(false);
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());
  const [agentResults, setAgentResults] = useState<Record<string, { time: string; count: number }>>({});
  const [publishTarget, setPublishTarget] = useState<ContentItem | null>(null);
  const [publishResult, setPublishResult] = useState<{ content?: ContentItem | null; instagram?: any; instagramConfigured?: boolean } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    try {
      const res = await fetch("/api/content?months=6");
      const data = await res.json();
      setContent(data.content || []);
    } catch (e) {
      console.error("Could not load content:", e);
    }
  }, []);

  const loadImprovements = useCallback(async () => {
    try {
      const res = await fetch("/api/improvements");
      const data = await res.json();
      setImprovements(data.improvements || []);
    } catch (e) {
      console.error("Could not load improvements:", e);
    }
  }, []);

  useEffect(() => {
    loadContent();
    loadImprovements();
  }, [loadContent, loadImprovements]);

  // The open tab lives in the URL, so a refresh comes back to where you were
  // instead of the dashboard, and back/forward move between tabs.
  useEffect(() => {
    const fromHash = () => {
      const value = window.location.hash.replace(/^#/, "");
      if (isTab(value)) setTab(value);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const changeTab = useCallback((next: Tab) => {
    setTab(next);
    if (window.location.hash.replace(/^#/, "") !== next) {
      window.history.pushState(null, "", `#${next}`);
    }
  }, []);

  /** Regenerate a fresh take, or alter this copy against a note. */
  const handleRework = useCallback(
    async (id: string, action: "regenerate" | "alter", prompt?: string) => {
      setBusyId(id);
      try {
        const res = await fetch("/api/alter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action, prompt }),
        });
        const data = await res.json();
        if (data.error) console.error("Rework failed:", data.error);
        await loadContent();
      } catch (e) {
        console.error("Rework failed:", e);
      }
      setBusyId(null);
    },
    [loadContent]
  );

  const stats = {
    total: content.length,
    pending: content.filter((c) => c.status === "pending").length,
    approved: content.filter((c) => c.status === "approved").length,
    published: content.filter((c) => c.status === "published").length,
    rejected: content.filter((c) => c.status === "rejected").length,
    improvements: improvements.filter((i) => i.status === "suggested").length,
    agents: agentConfigs.filter((a) => a.enabled).length,
    byType: {
      reel: content.filter((c) => c.type === "reel").length,
      post: content.filter((c) => c.type === "post").length,
      carousel: content.filter((c) => c.type === "carousel").length,
      story: content.filter((c) => c.type === "story").length,
    },
  };

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: genType,
          theme: genTheme || undefined,
          roleId: genRole || undefined,
          steer: genIdea.trim() || undefined,
          mode: genMode,
          durationSec: genType === "reel" ? Number(genDuration) || undefined : undefined,
          count: genType === "story" ? Number(genFrames) || undefined : undefined,
          design: { mode: genDesign, template: genTemplate },
        }),
      });
      const data = await res.json();
      setGenNotice(
        data.freeArt === "procedural"
          ? "no ai key is set, so freedom used the built-in generative composer. add ANTHROPIC_API_KEY (and FREEDOM_MODEL for best art) for fully model-designed artwork."
          : ""
      );
      if (data.content) {
        await loadContent();
        changeTab("queue");
      } else {
        // The route always answers with either content or an error; a request
        // that reaches here with neither used to leave the button just
        // resetting with no sign anything went wrong.
        setGenError(data.error || `Request failed (HTTP ${res.status}).`);
      }
    } catch (e: any) {
      setGenError(e?.message || "Network error while generating.");
    }
    setGenerating(false);
  }, [genType, genTheme, genRole, genIdea, genMode, genDuration, genFrames, genDesign, genTemplate, loadContent, changeTab]);

  const handleGenerateBatch = useCallback(async () => {
    setGenerating(true);
    try {
      const types: ContentType[] = ["reel", "post", "carousel"];
      for (const type of types) {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        const data = await res.json();
        if (data.content) await loadContent();
      }
    } catch (e) {
      console.error("Batch generation failed:", e);
    }
    setGenerating(false);
  }, [loadContent]);

  const handleContentAction = useCallback(async (id: string, action: string) => {
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (data.content) {
        // Approving schedules, so take the whole item back (it has a slot now).
        setContent((prev) => prev.map((c) => (c.id === id ? { ...c, ...data.content } : c)));
      }
    } catch (e) {
      console.error("Action failed:", e);
    }
  }, []);

  const handleReschedule = useCallback(async (id: string, iso: string) => {
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "reschedule", scheduledFor: iso }),
      });
      const data = await res.json();
      if (data.content) setContent((prev) => prev.map((c) => (c.id === id ? { ...c, ...data.content } : c)));
    } catch (e) {
      console.error("Reschedule failed:", e);
    }
  }, []);

  const handleDesign = useCallback(async (id: string, design: DesignChoice) => {
    // Template and auto switch instantly. Freedom is drawn by the model, so show
    // the spinner until the new artwork exists rather than a stale picture.
    const drawn = design.mode === "freedom";
    if (drawn) setBusyId(id);
    else setContent((prev) => prev.map((c) => (c.id === id ? { ...c, design, imageUrls: [] } : c)));
    try {
      const res = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, design }),
      });
      const data = await res.json();
      if (data.error) {
        console.error("Design failed:", data.error);
        await loadContent();
      } else if (data.content) {
        setContent((prev) => prev.map((c) => (c.id === id ? { ...c, ...data.content } : c)));
      }
    } catch (e) {
      console.error("Design failed:", e);
      await loadContent();
    }
    if (drawn) setBusyId(null);
  }, [loadContent]);

  const handleGenerateImprovements = useCallback(async () => {
    setLoadingImprovements(true);
    try {
      const res = await fetch("/api/improvements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const data = await res.json();
      if (data.improvements) {
        setImprovements((prev) => [...data.improvements, ...prev]);
      }
    } catch (e) {
      console.error("Improvements generation failed:", e);
    }
    setLoadingImprovements(false);
  }, []);

  const handleImprovementAction = useCallback(async (id: string, action: string) => {
    try {
      const res = await fetch("/api/improvements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (data.improvement) {
        setImprovements((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: data.improvement.status } : i))
        );
      }
    } catch (e) {
      console.error("Improvement action failed:", e);
    }
  }, []);


  const handleDeleteContent = useCallback(async (id: string) => {
    // Optimistic: the card should vanish on click, and a failure puts it back.
    const snapshot = content;
    setContent((prev) => prev.filter((c) => c.id !== id));
    try {
      const res = await fetch("/api/content/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      console.error("Delete failed:", e);
      setContent(snapshot);
    }
  }, [content]);

  const handleCleanup = useCallback(
    async (olderThanDays: number, statuses: ContentItem["status"][]) => {
      setCleaning(true);
      try {
        const res = await fetch("/api/content/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ olderThanDays, statuses }),
        });
        const data = await res.json();
        setCleanupResult(
          data.error
            ? data.error
            : `removed ${data.deleted} ${data.deleted === 1 ? "piece" : "pieces"} and ${data.imagesRemoved} image${data.imagesRemoved === 1 ? "" : "s"}.`
        );
        await loadContent();
      } catch (e) {
        console.error("Cleanup failed:", e);
        setCleanupResult("cleanup failed. check the logs.");
      }
      setCleaning(false);
    },
    [loadContent]
  );

  const handlePublishClick = useCallback((id: string) => {
    const item = content.find((c) => c.id === id);
    if (item) {
      setPublishTarget(item);
      setPublishResult(null);
    }
  }, [content]);

  const handlePublishConfirm = useCallback(async (skipSocial: boolean) => {
    if (!publishTarget) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: publishTarget.id, skipSocial }),
      });
      const data = await res.json();
      setPublishResult(data);

      // The server decides the status. Forcing "published" here marked failed
      // posts as done, which hid the card's publish button and left no way to
      // try again.
      if (data.content) {
        setContent((prev) =>
          prev.map((c) => (c.id === publishTarget.id ? { ...c, ...data.content } : c))
        );
      }

      const failed = data.instagram && !data.instagram.success;
      if (data.content && !failed) {
        setTimeout(() => {
          setPublishTarget(null);
          setPublishResult(null);
        }, 2000);
      }
    } catch (e) {
      console.error("Publish failed:", e);
    }
    setPublishing(false);
  }, [publishTarget]);

  const handleRunAgent = useCallback(async (agent: AgentConfig) => {
    setRunningAgents((prev) => new Set([...prev, agent.id]));
    try {
      const res = await fetch(agent.endpoint);
      const data = await res.json();

      if (data.content) {
        const items = Array.isArray(data.content) ? data.content : [data.content];
        // For content agents, we need to fetch full items via generate endpoint
        // The cron endpoints return summaries, so let's just record the result
        setAgentResults((prev) => ({
          ...prev,
          [agent.id]: { time: new Date().toISOString(), count: data.count || 1 },
        }));
      }
      if (data.improvements) {
        const items = Array.isArray(data.improvements) ? data.improvements : [data.improvements];
        setAgentResults((prev) => ({
          ...prev,
          [agent.id]: { time: new Date().toISOString(), count: data.count || items.length },
        }));
      }

      // Refetch all content and improvements
      setAgentResults((prev) => ({
        ...prev,
        [agent.id]: { time: new Date().toISOString(), count: data.count || 1 },
      }));
    } catch (e) {
      console.error(`Agent ${agent.id} failed:`, e);
    }
    setRunningAgents((prev) => {
      const next = new Set(prev);
      next.delete(agent.id);
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar active={tab} onChange={changeTab} stats={stats} />

      <main className="flex-1 overflow-y-auto scrollbar-thin pb-20 md:pb-0">
        {tab === "dashboard" && (
          <DashboardView
            stats={stats}
            content={content}
            agentResults={agentResults}
            onGenerate={() => changeTab("generate")}
            onGenerateBatch={handleGenerateBatch}
            onViewAgents={() => changeTab("agents")}
            generating={generating}
          />
        )}
        {tab === "agents" && <AgentsPanel onContentChanged={loadContent} />}
        {tab === "generate" && (
          <GenerateView
            genType={genType}
            setGenType={setGenType}
            genTheme={genTheme}
            setGenTheme={setGenTheme}
            genRole={genRole}
            setGenRole={setGenRole}
            genDuration={genDuration}
            setGenDuration={setGenDuration}
            genFrames={genFrames}
            setGenFrames={setGenFrames}
            genIdea={genIdea}
            setGenIdea={setGenIdea}
            genMode={genMode}
            setGenMode={setGenMode}
            genDesign={genDesign}
            setGenDesign={setGenDesign}
            genTemplate={genTemplate}
            setGenTemplate={setGenTemplate}
            genNotice={genNotice}
            generating={generating}
            onGenerate={handleGenerate}
            genError={genError}
          />
        )}
        {tab === "queue" && (
          <QueueView
            content={content}
            busyId={busyId}
            onApprove={(id) => handleContentAction(id, "approve")}
            onReject={(id) => handleContentAction(id, "reject")}
            onPublish={handlePublishClick}
            onRegenerate={(id) => handleRework(id, "regenerate")}
            onAlter={(id, p) => handleRework(id, "alter", p)}
            onDesign={handleDesign}
            onReschedule={handleReschedule}
            onDelete={handleDeleteContent}
            onCleanup={handleCleanup}
            cleaning={cleaning}
            cleanupResult={cleanupResult}
          />
        )}
        {tab === "schedule" && (
          <ScheduleView content={content} onPublishNow={handlePublishClick} />
        )}
        {tab === "creatives" && <CreativesPanel />}
        {tab === "improvements" && (
          <ImprovementsView
            improvements={improvements}
            loading={loadingImprovements}
            onGenerate={handleGenerateImprovements}
            onApprove={(id) => handleImprovementAction(id, "approve")}
            onReject={(id) => handleImprovementAction(id, "reject")}
            onPush={(id) => handleImprovementAction(id, "push")}
          />
        )}
        {tab === "usage" && <UsagePanel />}
        {tab === "command" && <CommandPanel />}
        {tab === "sales" && <SalesPanel />}
        {tab === "intelligence" && <IntelligencePanel />}
        {tab === "operations" && <OperationsPanel />}
      </main>

      {/* Publish Confirmation Modal */}
      {publishTarget && (
        <div className="fixed inset-0 bg-ink-black/85 flex items-center justify-center z-50 p-4" onClick={() => { setPublishTarget(null); setPublishResult(null); }}>
          <div className="bg-twilight-indigo border border-gold/20 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gold/10">
              <div>
                <p className="text-[10px] tracking-[2px] uppercase text-cool-steel">publish confirmation</p>
                <h2 className="font-serif italic text-xl text-champagne mt-1">ready to go live?</h2>
              </div>
              <button
                onClick={() => { setPublishTarget(null); setPublishResult(null); }}
                className="p-1.5 text-cool-steel hover:text-champagne transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] tracking-wider uppercase px-1.5 py-0.5 ${
                  publishTarget.type === "reel" ? "bg-strawberry-red/15 text-strawberry-red" :
                  publishTarget.type === "carousel" ? "bg-emerald/15 text-emerald" :
                  "bg-gold/15 text-gold"
                }`}>
                  {publishTarget.type}
                </span>
                <h3 className="text-sm font-semibold text-champagne truncate">{publishTarget.title}</h3>
              </div>
              <p className="text-xs text-cool-steel leading-relaxed line-clamp-4 whitespace-pre-wrap">
                {publishTarget.reelScript || publishTarget.caption}
              </p>
              {publishTarget.hashtags.length > 0 && publishTarget.hashtags[0] !== "#strategy" && (
                <div className="flex flex-wrap gap-1">
                  {publishTarget.hashtags.slice(0, 8).map((tag) => (
                    <span key={tag} className="text-[9px] text-gold/60">{tag}</span>
                  ))}
                </div>
              )}
              {publishTarget.svgCode && (
                <div
                  className="rounded-sm overflow-hidden border border-gold/10 bg-ink-black"
                  dangerouslySetInnerHTML={{ __html: publishTarget.svgCode }}
                  style={{ maxHeight: 120 }}
                />
              )}
            </div>

            {publishResult?.content ? (
              <div className="p-5 border-t border-gold/10 space-y-3">
                {publishResult.instagram && !publishResult.instagram.success ? (
                  <>
                    <div className="flex items-center gap-2 text-strawberry-red">
                      <AlertCircle size={18} />
                      <span className="text-sm font-semibold">not posted to instagram</span>
                    </div>
                    <p className="text-[10px] text-strawberry-red/90 leading-relaxed">
                      {publishResult.instagram.error}
                    </p>
                    <p className="text-[10px] text-cool-steel">
                      the piece is still approved, so you can fix the cause and try again.
                    </p>
                    <button
                      onClick={() => { setPublishResult(null); handlePublishConfirm(false); }}
                      disabled={publishing}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-champagne text-ink-black text-[11px] font-bold tracking-wider uppercase hover:bg-gold transition-colors disabled:opacity-50"
                      style={{ boxShadow: "2px 2px 0 #8b7bff" }}
                    >
                      {publishing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {publishing ? "retrying..." : "retry publishing"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-emerald">
                      <CheckCircle2 size={18} />
                      <span className="text-sm font-semibold">
                        {publishResult.instagram?.success ? "published successfully" : "marked as published"}
                      </span>
                    </div>
                    {publishResult.instagram?.success ? (
                      <p className="text-[10px] text-cool-steel flex items-center gap-1">
                        <ExternalLink size={10} /> posted to instagram
                      </p>
                    ) : (
                      <p className="text-[10px] text-cool-steel">
                        nothing was sent to instagram for this one.
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="p-5 border-t border-gold/10 space-y-2">
                <button
                  onClick={() => handlePublishConfirm(false)}
                  disabled={publishing}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-champagne text-ink-black text-[11px] font-bold tracking-wider uppercase hover:bg-gold transition-colors disabled:opacity-50"
                  style={{ boxShadow: "2px 2px 0 #8b7bff" }}
                >
                  {publishing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  {publishing ? "publishing..." : "yes, publish now"}
                </button>
                <button
                  onClick={() => handlePublishConfirm(true)}
                  disabled={publishing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-gold/20 text-gold text-[11px] tracking-wider uppercase hover:bg-gold/10 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  mark as published only
                </button>
                <button
                  onClick={() => { setPublishTarget(null); setPublishResult(null); }}
                  className="w-full py-2 text-[11px] tracking-wider uppercase text-cool-steel hover:text-champagne transition-colors"
                >
                  cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Agents ─── */
/* ─── Dashboard ─── */
function DashboardView({
  stats, content, agentResults, onGenerate, onGenerateBatch, onViewAgents, generating,
}: {
  stats: any; content: ContentItem[];
  agentResults: Record<string, { time: string; count: number }>;
  onGenerate: () => void; onGenerateBatch: () => void; onViewAgents: () => void;
  generating: boolean;
}) {
  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Hero */}
      <div className="rise relative overflow-hidden rounded-2xl border border-gold/15 bg-twilight-indigo/40 p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-40 h-96 w-96 rounded-full bg-pulse opacity-20 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-cool-steel">AI company orchestration platform</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-champagne md:text-5xl">
              Good to see you. Four teams, {TOTAL_AGENTS} agents, one orchestrator.
            </h1>
            <p className="mt-3 max-w-lg text-sm text-cool-steel">
              AutonomOS plans work, delegates tasks, coordinates agents and tracks outcomes. Give it a goal, approve what matters, and let the rest run.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#command"
                className="inline-flex items-center gap-2 rounded-lg bg-pulse px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6a4cf0]"
              >
                <Sparkles size={16} /> Give the orchestrator a goal
              </a>
              <button
                onClick={onGenerateBatch}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-lg border border-gold/25 px-5 py-2.5 text-sm text-champagne transition-colors hover:bg-gold/10 disabled:opacity-50"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
                Marketing daily batch
              </button>
              <button
                onClick={onViewAgents}
                className="inline-flex items-center gap-2 rounded-lg border border-gold/25 px-5 py-2.5 text-sm text-champagne transition-colors hover:bg-gold/10"
              >
                <Bot size={16} /> Marketing agents
              </button>
              <button
                onClick={onGenerate}
                className="inline-flex items-center gap-2 rounded-lg border border-gold/25 px-5 py-2.5 text-sm text-champagne transition-colors hover:bg-gold/10"
              >
                <ArrowRight size={16} /> Custom content
              </button>
            </div>
          </div>
          <div className="flex justify-center text-champagne">
            <OrchestratorGraph active={["marketing", "sales", "intelligence", "operations"]} counts={{ marketing: 10, sales: 4, intelligence: 4, operations: 4 }} size={260} />
          </div>
        </div>
      </div>

      {/* Departments */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DEPARTMENTS.map((d) => (
          <a
            key={d.id}
            href={d.id === "marketing" ? "#agents" : `#${d.id}`}
            className="rise group relative overflow-hidden rounded-2xl border border-gold/10 bg-twilight-indigo/30 p-5 transition-colors hover:border-gold/30"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-40" style={{ background: d.color }} />
            <div className="flex items-center justify-between">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.mark} alt="" width={36} height={36} className="rounded-lg" />
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" /> live
              </span>
            </div>
            <p className="mt-4 font-serif text-2xl text-champagne">{d.name}</p>
            <p className="text-[12px] text-cool-steel">{d.blurb}</p>
            <p className="mt-3 flex items-center gap-1 text-[12px] text-champagne/80">
              {d.id === "marketing" ? 10 : d.agents.length} agents <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </p>
          </a>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "total content", value: stats.total, icon: BarChart3, color: "text-gold" },
          { label: "pending review", value: stats.pending, icon: Clock, color: "text-gold" },
          { label: "approved", value: stats.approved, icon: CheckCircle2, color: "text-emerald" },
          { label: "published", value: stats.published, icon: Send, color: "text-cool-steel" },
          { label: "active agents", value: stats.agents, icon: Bot, color: "text-emerald" },
        ].map((stat) => (
          <div key={stat.label} className="border border-gold/10 bg-twilight-indigo/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} className={stat.color} />
              <span className="text-[10px] tracking-wider uppercase text-cool-steel">{stat.label}</span>
            </div>
            <span className="font-serif italic text-3xl text-champagne">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Content Type Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "reels", count: stats.byType.reel, icon: Film, color: "text-strawberry-red bg-strawberry-red/10" },
          { label: "posts", count: stats.byType.post, icon: Image, color: "text-gold bg-gold/10" },
          { label: "carousels", count: stats.byType.carousel, icon: Layers, color: "text-emerald bg-emerald/10" },
          { label: "stories", count: stats.byType.story, icon: Smartphone, color: "text-strawberry-red bg-strawberry-red/10" },
        ].map((type) => (
          <div key={type.label} className="border border-gold/10 bg-twilight-indigo/30 p-4 flex items-center gap-3">
            <div className={`p-2 rounded-sm ${type.color}`}>
              <type.icon size={18} />
            </div>
            <div>
              <span className="font-serif italic text-2xl text-champagne">{type.count}</span>
              <p className="text-[10px] tracking-wider uppercase text-cool-steel">{type.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Status Summary */}
      <div className="border border-gold/10 bg-twilight-indigo/20 p-6">
        <h2 className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-4 flex items-center gap-2">
          <Bot size={14} /> agent fleet status
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          {agentConfigs.filter(a => a.enabled).map((agent) => {
            const Icon = iconMap[agent.icon] || Bot;
            const result = agentResults[agent.id];
            return (
              <div key={agent.id} className="flex items-center gap-3 p-2">
                <div className={`p-1.5 rounded-sm ${agent.color}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-champagne lowercase">{agent.name}</p>
                  <p className="text-[9px] text-cool-steel">{agent.cronHuman}</p>
                </div>
                {result ? (
                  <span className="text-[9px] text-emerald">
                    {result.count} items
                  </span>
                ) : (
                  <span className="text-[9px] text-cool-steel/50">waiting</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Content */}
      {content.length > 0 && (
        <div>
          <h2 className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-4">recent content</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {content.slice(0, 4).map((item) => (
              <ContentCard key={item.id} item={item} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Generate ─── */
const ARTWORK_CARDS: { mode: DesignChoice["mode"]; icon: typeof Sparkles; label: string; desc: string }[] = [
  { mode: "auto", icon: Palette, label: "auto", desc: "the house look, picked for you" },
  { mode: "template", icon: LayoutTemplate, label: "templates", desc: "pin one of the twelve designed looks" },
  { mode: "freedom", icon: Dices, label: "freedom", desc: "a brand new composition, palette and background every time" },
];

function GenerateView({
  genType, setGenType, genTheme, setGenTheme, genRole, setGenRole,
  genDuration, setGenDuration, genFrames, setGenFrames, genIdea, setGenIdea,
  genMode, setGenMode, genDesign, setGenDesign, genTemplate, setGenTemplate, genNotice,
  generating, onGenerate, genError,
}: {
  genType: ContentType; setGenType: (t: ContentType) => void;
  genTheme: string; setGenTheme: (t: string) => void;
  genRole: string; setGenRole: (r: string) => void;
  genDuration: string; setGenDuration: (d: string) => void;
  genFrames: string; setGenFrames: (f: string) => void;
  genIdea: string; setGenIdea: (i: string) => void;
  genMode: "template" | "free"; setGenMode: (m: "template" | "free") => void;
  genDesign: DesignChoice["mode"]; setGenDesign: (m: DesignChoice["mode"]) => void;
  genTemplate: string; setGenTemplate: (t: string) => void;
  genNotice: string;
  generating: boolean; onGenerate: () => void;
  genError: string | null;
}) {
  const duration = Number(genDuration);
  const durationValid = Number.isFinite(duration) && duration >= 3 && duration <= 90;
  return (
    <div className="p-6 md:p-8 max-w-2xl space-y-8">
      <div>
        <p className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-2">content forge</p>
        <h1 className="font-serif italic text-3xl text-champagne">generate content.</h1>
        <p className="text-sm text-cool-steel mt-2">
          craft instagram content that bleeds the medieval aesthetic. dark, dramatic, irresistible.
        </p>
      </div>

      {/* Content Type */}
      <div>
        <label className="text-[10px] tracking-[2px] uppercase text-cool-steel block mb-3">
          content type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { type: "reel" as const, icon: Film, label: "reel", desc: "video script, you set the length" },
            { type: "post" as const, icon: Image, label: "post", desc: "caption + image brief" },
            { type: "carousel" as const, icon: Layers, label: "carousel", desc: "5-7 slide deck" },
            { type: "story" as const, icon: Smartphone, label: "story", desc: "you set the frame count" },
          ].map((item) => (
            <button
              key={item.type}
              onClick={() => setGenType(item.type)}
              className={`p-4 border text-left transition-all ${
                genType === item.type
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-gold/10 bg-twilight-indigo/30 text-cool-steel hover:border-gold/30"
              }`}
            >
              <item.icon size={20} className="mb-2" />
              <p className="text-sm font-semibold lowercase">{item.label}</p>
              <p className="text-[10px] mt-1 opacity-70">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Two ways to write a piece, both kept in rotation. */}
      <div>
        <label className="text-[10px] tracking-[2px] uppercase text-cool-steel block mb-3">
          how it is written
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              id: "template" as const,
              label: "template",
              desc: "house style, theme crossed with role. predictable and on brand.",
            },
            {
              id: "free" as const,
              label: "freedom",
              desc: "no template. the model picks the angle. bolder, less predictable.",
            },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setGenMode(m.id)}
              className={`p-3 border text-left transition-all ${
                genMode === m.id
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-gold/10 bg-twilight-indigo/30 text-cool-steel hover:border-gold/30"
              }`}
            >
              <p className="text-sm font-semibold lowercase">{m.label}</p>
              <p className="text-[10px] mt-1 opacity-70 leading-relaxed">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* The operator's own brief. Everything below is a nudge; this is the
          only place to ask for something specific. */}
      <div>
        <label
          htmlFor="gen-idea"
          className="text-[10px] tracking-[2px] uppercase text-cool-steel block mb-3"
        >
          your idea (optional)
        </label>
        <textarea
          id="gen-idea"
          value={genIdea}
          onChange={(e) => setGenIdea(e.target.value)}
          rows={3}
          placeholder="9 days to go countdown. build the hype, make it feel like the gates open soon..."
          className="w-full bg-twilight-indigo/50 border border-gold/15 text-champagne px-4 py-3 text-sm placeholder:text-cool-steel/50 focus:outline-none focus:border-gold/40 resize-none"
        />
        <p className="text-[10px] text-cool-steel/60 mt-2">
          say what this piece is about and the copy will actually say it. leave it
          empty and the agent picks its own angle.
        </p>
      </div>

      {/* Reel length. Typed rather than preset so any length is reachable. */}
      {genType === "reel" && (
        <div>
          <label
            htmlFor="reel-duration"
            className="text-[10px] tracking-[2px] uppercase text-cool-steel block mb-3"
          >
            duration in seconds
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              id="reel-duration"
              type="number"
              min={3}
              max={90}
              value={genDuration}
              onChange={(e) => setGenDuration(e.target.value)}
              className={`w-28 bg-twilight-indigo/50 border text-champagne px-4 py-3 text-sm tabular-nums focus:outline-none ${
                durationValid
                  ? "border-gold/15 focus:border-gold/40"
                  : "border-strawberry-red/60"
              }`}
            />
            <div className="flex gap-1">
              {[15, 30, 60, 90].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGenDuration(String(preset))}
                  className="px-3 py-1.5 text-[11px] tabular-nums text-cool-steel border border-gold/10 hover:text-champagne hover:border-gold/30 transition-colors"
                >
                  {preset}s
                </button>
              ))}
            </div>
          </div>
          <p
            className={`text-[10px] mt-2 ${
              durationValid ? "text-cool-steel/60" : "text-strawberry-red"
            }`}
          >
            {durationValid
              ? `the script will be written to run about ${duration} seconds.`
              : "instagram reels run between 3 and 90 seconds."}
          </p>
        </div>
      )}

      {/* Story length. */}
      {genType === "story" && (
        <div>
          <label
            htmlFor="story-frames"
            className="text-[10px] tracking-[2px] uppercase text-cool-steel block mb-3"
          >
            frames
          </label>
          <input
            id="story-frames"
            type="number"
            min={1}
            max={5}
            value={genFrames}
            onChange={(e) => setGenFrames(e.target.value)}
            className="w-28 bg-twilight-indigo/50 border border-gold/15 text-champagne px-4 py-3 text-sm tabular-nums focus:outline-none focus:border-gold/40"
          />
          <p className="text-[10px] text-cool-steel/60 mt-2">
            one frame is a single screen. up to five.
          </p>
        </div>
      )}

      {/* Theme and role are suggestions, not a fixed vocabulary: both take any
          text, with the built-in options offered through a custom dropdown
          (native <datalist> popovers do not reliably open on Android). */}
      <div>
        <label
          htmlFor="gen-theme"
          className="text-[10px] tracking-[2px] uppercase text-cool-steel block mb-3"
        >
          theme (optional{genMode === "template" ? ", random if empty" : ""})
        </label>
        <SuggestInput
          id="gen-theme"
          value={genTheme}
          onChange={setGenTheme}
          options={themes.map((t) => ({ value: t }))}
          placeholder="pick one, or type your own"
          className="w-full bg-twilight-indigo/50 border border-gold/15 text-champagne px-4 py-3 text-sm placeholder:text-cool-steel/50 focus:outline-none focus:border-gold/40"
        />
        <div className="flex gap-1 mt-2">
          <button
            type="button"
            onClick={() => setGenTheme("none")}
            className="px-2.5 py-1 text-[10px] tracking-wider uppercase text-cool-steel border border-gold/10 hover:text-champagne hover:border-gold/30 transition-colors"
          >
            no theme
          </button>
          {genMode === "template" && (
            <button
              type="button"
              onClick={() => setGenTheme("")}
              className="px-2.5 py-1 text-[10px] tracking-wider uppercase text-cool-steel border border-gold/10 hover:text-champagne hover:border-gold/30 transition-colors"
            >
              random
            </button>
          )}
        </div>
        {genMode === "free" && (
          <p className="text-[10px] text-cool-steel/60 mt-2">
            freedom picks its own angle with nothing set here. only fill this in
            to steer it toward something specific.
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="gen-role"
          className="text-[10px] tracking-[2px] uppercase text-cool-steel block mb-3"
        >
          featured role (optional{genMode === "template" ? ", random if empty" : ""})
        </label>
        <SuggestInput
          id="gen-role"
          value={genRole}
          onChange={setGenRole}
          options={roles.map((r) => ({ value: r.name, hint: r.tagline }))}
          placeholder="pick a role, or name anything else"
          className="w-full bg-twilight-indigo/50 border border-gold/15 text-champagne px-4 py-3 text-sm placeholder:text-cool-steel/50 focus:outline-none focus:border-gold/40"
        />
        <div className="flex gap-1 mt-2">
          <button
            type="button"
            onClick={() => setGenRole("none")}
            className="px-2.5 py-1 text-[10px] tracking-wider uppercase text-cool-steel border border-gold/10 hover:text-champagne hover:border-gold/30 transition-colors"
          >
            no role
          </button>
          {genMode === "template" && (
            <button
              type="button"
              onClick={() => setGenRole("")}
              className="px-2.5 py-1 text-[10px] tracking-wider uppercase text-cool-steel border border-gold/10 hover:text-champagne hover:border-gold/30 transition-colors"
            >
              random
            </button>
          )}
        </div>
        <p className="text-[10px] text-cool-steel/60 mt-2">
          {genMode === "free"
            ? "freedom is not pinned to a character by default, unlike the house template, which always features one. only fill this in to feature a specific role."
            : "the lists are shortcuts, not limits. type anything and it is used as written. pick no role for a countdown or announcement that is not about a character."}
        </p>
      </div>

      {/* Design System Preview */}
      <div className="border border-gold/10 bg-ink-black/40 p-4">
        <p className="text-[10px] tracking-[2px] uppercase text-cool-steel mb-3">
          design system reference
        </p>
        <div className="flex gap-2 mb-3">
          {["#141a3e", "#1c2454", "#c89858", "#f4e8c8", "#c8324a", "#3fb083", "#8a92b8"].map((c) => (
            <div key={c} className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 border border-white/10" style={{ background: c }} />
              <span className="text-[8px] text-cool-steel font-mono">{c}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-xs text-cool-steel">
          <span style={{ fontFamily: '"Instrument Serif", serif', fontStyle: "italic", fontSize: 16, color: "#f4e8c8" }}>
            Instrument Serif
          </span>
          <span style={{ fontFamily: '"Lora", serif', fontSize: 14, color: "#f4e8c8" }}>
            Lora Body
          </span>
        </div>
      </div>

      {/* Artwork direction. Independent of how the copy is written above. */}
      <div>
        <label className="text-[10px] tracking-[2px] uppercase text-cool-steel block mb-3">
          artwork
        </label>
        {genDesign === "freedom" ? (
          <div className="border border-gold bg-gold/10 p-4 flex items-start gap-3">
            <Dices size={22} className="text-gold mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gold lowercase">freedom</p>
              <p className="text-[11px] text-cool-steel mt-1">
                nothing is reused. the artwork is invented from the game concept for each piece: its own idea, composition, palette, background and
                lettering, drawn from scratch.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGenDesign("auto")}
              className="flex items-center gap-1 text-[10px] tracking-wider uppercase text-cool-steel hover:text-champagne"
            >
              <ArrowLeft size={12} /> options
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-2">
            {ARTWORK_CARDS.map((m) => (
              <button
                key={m.mode}
                type="button"
                onClick={() => setGenDesign(m.mode)}
                className={`p-4 border text-left transition-all ${
                  genDesign === m.mode
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-gold/10 bg-twilight-indigo/30 text-cool-steel hover:border-gold/30"
                }`}
              >
                <m.icon size={20} className="mb-2" />
                <p className="text-sm font-semibold lowercase">{m.label}</p>
                <p className="text-[10px] mt-1 opacity-70">{m.desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {genDesign === "template" && (
        <div>
          <label className="text-[10px] tracking-[2px] uppercase text-cool-steel block mb-3">template</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {templateOptions.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setGenTemplate(t.id)}
                className={`px-3 py-2.5 border text-xs lowercase text-left transition-all ${
                  genTemplate === t.id
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-gold/10 bg-twilight-indigo/30 text-cool-steel hover:border-gold/30"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 py-4 bg-champagne text-ink-black text-sm font-bold tracking-wider lowercase hover:bg-gold transition-colors disabled:opacity-50"
        style={{ boxShadow: "3px 3px 0 #8b7bff" }}
      >
        {generating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            generating {genType}...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            generate {genType}{genDesign === "freedom" ? " in freedom" : ""}
          </>
        )}
      </button>
      {genDesign === "freedom" && generating && (
        <p className="text-[11px] text-cool-steel -mt-4">
          the artwork is being designed from scratch. this can take a minute.
        </p>
      )}
      {genNotice && <p className="text-[11px] text-gold/80 -mt-4">{genNotice}</p>}

      {genError && (
        <div className="flex items-start gap-2 border border-strawberry-red/40 bg-strawberry-red/10 px-4 py-3 text-xs text-strawberry-red">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{genError}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Review Queue ─── */
function QueueView({
  content, busyId, onApprove, onReject, onPublish, onRegenerate, onAlter,
  onDesign, onReschedule, onDelete, onCleanup, cleaning, cleanupResult,
}: {
  content: ContentItem[];
  busyId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPublish: (id: string) => void;
  onRegenerate: (id: string) => void;
  onAlter: (id: string, prompt: string) => void;
  onDesign: (id: string, design: DesignChoice) => void;
  onReschedule: (id: string, iso: string) => void;
  onDelete: (id: string) => Promise<void>;
  onCleanup: (olderThanDays: number, statuses: ContentItem["status"][]) => Promise<void>;
  cleaning: boolean;
  cleanupResult: string | null;
}) {
  const [filter, setFilter] = useState<ContentItem["status"] | "all">("all");
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [days, setDays] = useState("30");

  const filtered = filter === "all" ? content : content.filter((c) => c.status === filter);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <p className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-2">content tribunal</p>
        <h1 className="font-serif italic text-3xl text-champagne">review queue.</h1>
        <p className="text-sm text-cool-steel mt-2">
          judge each piece. approve the worthy, reject the weak, publish the chosen.
        </p>
      </div>

      {/* Bulk cleanup. Deleting frees the stored artwork, not just the row. */}
      <div className="border border-gold/10 bg-twilight-indigo/20">
        <button
          onClick={() => setCleanupOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] tracking-wider uppercase text-cool-steel hover:text-champagne transition-colors"
        >
          <span className="flex items-center gap-2">
            <Trash2 size={13} /> clear out old content
          </span>
          <span className="text-[10px] text-cool-steel/60">{content.length} stored</span>
        </button>

        {cleanupOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-gold/10 pt-3">
            <p className="text-[11px] text-cool-steel/70">
              removes the pieces and the artwork rendered for them. published work is
              always kept.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] tracking-wider uppercase text-cool-steel">
                older than
              </span>
              <input
                type="number"
                min={0}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-20 bg-ink-black/60 border border-gold/20 px-3 py-2 text-xs text-champagne tabular-nums focus:outline-none focus:border-gold/50"
              />
              <span className="text-[10px] tracking-wider uppercase text-cool-steel">days</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                disabled={cleaning}
                onClick={() => onCleanup(Number(days) || 0, ["rejected"])}
                className="px-3 py-2 text-[11px] tracking-wider uppercase text-cool-steel border border-gold/15 hover:text-champagne hover:border-gold/40 transition-colors disabled:opacity-40"
              >
                rejected only
              </button>
              <button
                disabled={cleaning}
                onClick={() => onCleanup(Number(days) || 0, ["rejected", "draft", "pending"])}
                className="px-3 py-2 text-[11px] tracking-wider uppercase text-strawberry-red border border-strawberry-red/30 hover:bg-strawberry-red/10 transition-colors disabled:opacity-40"
              >
                rejected, drafts and pending
              </button>
              {cleaning && <Loader2 size={16} className="animate-spin text-gold self-center" />}
            </div>
            {cleanupResult && (
              <p className="text-[11px] text-emerald">{cleanupResult}</p>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {(["all", "pending", "approved", "published", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[11px] tracking-wider uppercase whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-gold/15 text-gold border border-gold/30"
                : "text-cool-steel border border-gold/10 hover:text-champagne"
            }`}
          >
            {f} {f !== "all" && `(${content.filter((c) => c.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-gold/10 bg-twilight-indigo/20">
          <Clock size={32} className="mx-auto text-cool-steel/50 mb-3" />
          <p className="text-sm text-cool-steel">no content here yet.</p>
          <p className="text-xs text-cool-steel/60 mt-1">generate some content to fill the queue.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              busy={busyId === item.id}
              onApprove={onApprove}
              onReject={onReject}
              onPublish={onPublish}
              onRegenerate={onRegenerate}
              onAlter={onAlter}
              onDesign={onDesign}
              onReschedule={onReschedule}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Schedule ───
 * What is queued to post, grouped by the IST calendar day it lands on. The
 * actual peak windows live in lib/schedule.ts (12-2pm and 7-9pm IST); this
 * recomputes the same IST conversion purely for display grouping, since
 * that lib has no client-safe formatting export and doesn't need one just
 * for this.
 */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function istDayKey(iso: string): string {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function istTimeLabel(iso: string): string {
  const ist = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes();
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")}${period} ist`;
}

function scheduleDayLabel(dayKey: string): string {
  const today = istDayKey(new Date().toISOString());
  const tomorrow = istDayKey(new Date(Date.now() + 86400000).toISOString());
  if (dayKey === today) return "today";
  if (dayKey === tomorrow) return "tomorrow";
  return new Date(dayKey + "T00:00:00Z")
    .toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })
    .toLowerCase();
}

const scheduleTypeIcons: Record<string, typeof Film> = {
  reel: Film,
  post: Image,
  carousel: Layers,
  story: Smartphone,
};

function ScheduleView({
  content,
  onPublishNow,
}: {
  content: ContentItem[];
  onPublishNow: (id: string) => void;
}) {
  const scheduled = content
    .filter((c) => c.status === "approved" && c.scheduledFor)
    .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime());
  const unscheduled = content.filter((c) => c.status === "approved" && !c.scheduledFor);

  const groups = new Map<string, ContentItem[]>();
  for (const item of scheduled) {
    const key = istDayKey(item.scheduledFor!);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <p className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-2">publish schedule</p>
        <h1 className="font-serif italic text-3xl text-champagne">what&apos;s going out, and when.</h1>
        <p className="text-sm text-cool-steel mt-2">
          every approved piece and the peak window it&apos;s queued for. the morning
          and midday crons publish each one once its window arrives.
        </p>
      </div>

      {groups.size === 0 && unscheduled.length === 0 && (
        <p className="text-sm text-cool-steel">
          nothing approved yet. approve a piece in the review queue to see it here.
        </p>
      )}

      {[...groups.entries()].map(([dayKey, items]) => (
        <div key={dayKey}>
          <h2 className="text-sm tracking-wider uppercase text-gold mb-3">
            {scheduleDayLabel(dayKey)}
          </h2>
          <div className="space-y-2">
            {items.map((item) => (
              <ScheduleRow
                key={item.id}
                item={item}
                timeLabel={istTimeLabel(item.scheduledFor!)}
                onPublishNow={onPublishNow}
              />
            ))}
          </div>
        </div>
      ))}

      {unscheduled.length > 0 && (
        <div>
          <h2 className="text-sm tracking-wider uppercase text-cool-steel mb-3">
            approved, not scheduled ({unscheduled.length})
          </h2>
          <p className="text-[11px] text-cool-steel/70 mb-3">
            approved before auto-publish was on, or while it was switched off in the agents tab.
            these wait for a manual publish rather than a peak window.
          </p>
          <div className="space-y-2">
            {unscheduled.map((item) => (
              <ScheduleRow key={item.id} item={item} timeLabel="unscheduled" onPublishNow={onPublishNow} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleRow({
  item,
  timeLabel,
  onPublishNow,
}: {
  item: ContentItem;
  timeLabel: string;
  onPublishNow: (id: string) => void;
}) {
  const Icon = scheduleTypeIcons[item.type] || Image;
  return (
    <div className="flex items-center gap-3 border border-gold/10 bg-ink-black/40 p-3">
      <div className="p-2 rounded-sm bg-gold/10 shrink-0">
        <Icon size={16} className="text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-champagne truncate">{item.title}</p>
        <p className="text-[11px] text-cool-steel">
          {item.theme || item.type} · {timeLabel}
        </p>
      </div>
      <button
        onClick={() => onPublishNow(item.id)}
        className="px-3 py-1.5 text-[10px] tracking-wider uppercase text-gold border border-gold/20 hover:bg-gold/10 transition-colors shrink-0"
      >
        publish now
      </button>
    </div>
  );
}

/* ─── Improvements ─── */
function ImprovementsView({
  improvements, loading, onGenerate, onApprove, onReject, onPush,
}: {
  improvements: Improvement[]; loading: boolean;
  onGenerate: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPush: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Improvement["category"] | "all">("all");

  const filtered = filter === "all"
    ? improvements
    : improvements.filter((i) => i.category === filter);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-2">game forge</p>
          <h1 className="font-serif italic text-3xl text-champagne">improvements.</h1>
          <p className="text-sm text-cool-steel mt-2">
            AI-analyzed suggestions to level up the game. approve and push directly to the repo.
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-champagne text-ink-black text-xs font-bold tracking-wider lowercase hover:bg-gold transition-colors disabled:opacity-50 whitespace-nowrap"
          style={{ boxShadow: "2px 2px 0 #8b7bff" }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          scan for improvements
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {(["all", "concept", "ux", "feature", "performance", "design", "engagement"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[11px] tracking-wider uppercase whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-gold/15 text-gold border border-gold/30"
                : "text-cool-steel border border-gold/10 hover:text-champagne"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Improvement Pipeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-gold/10 bg-twilight-indigo/20">
          <Lightbulb size={32} className="mx-auto text-cool-steel/50 mb-3" />
          <p className="text-sm text-cool-steel">no improvements scanned yet.</p>
          <p className="text-xs text-cool-steel/60 mt-1">
            click &ldquo;scan for improvements&rdquo; to analyze the game codebase.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <ImprovementCard
              key={item.id}
              item={item}
              onApprove={onApprove}
              onReject={onReject}
              onPush={onPush}
            />
          ))}
        </div>
      )}

      {/* How It Works */}
      <div className="border border-gold/10 bg-twilight-indigo/20 p-6">
        <h2 className="text-[11px] tracking-[2px] uppercase text-cool-steel mb-4 flex items-center gap-2">
          <Target size={14} /> how the improvement pipeline works
        </h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { step: "1", title: "scan", desc: "AI analyzes the game codebase for potential improvements" },
            { step: "2", title: "review", desc: "you review each suggestion, approve or reject" },
            { step: "3", title: "approve", desc: "approved improvements are staged for deployment" },
            { step: "4", title: "push", desc: "push approved changes directly to the game repo" },
          ].map((s) => (
            <div key={s.step} className="flex gap-3">
              <div className="w-6 h-6 bg-gold/15 text-gold text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                {s.step}
              </div>
              <div>
                <p className="text-xs font-semibold text-champagne lowercase">{s.title}</p>
                <p className="text-[10px] text-cool-steel mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
