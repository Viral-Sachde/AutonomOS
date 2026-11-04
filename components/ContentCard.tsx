"use client";

import { useState } from "react";
import { ContentItem, DesignChoice, templateOptions } from "@/lib/design-system";
import {
  Film, Image, Layers, Check, X, Send, Smartphone, Palette,
  RefreshCw, Wand2, Loader2, CornerDownLeft, Trash2, CalendarClock, Dices, LayoutTemplate,
} from "lucide-react";

interface ContentCardProps {
  item: ContentItem;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onPublish?: (id: string) => void;
  onRegenerate?: (id: string) => Promise<void> | void;
  onAlter?: (id: string, prompt: string) => Promise<void> | void;
  onDesign?: (id: string, design: DesignChoice) => Promise<void> | void;
  onReschedule?: (id: string, iso: string) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  busy?: boolean;
  compact?: boolean;
}

const typeIcons: Record<string, typeof Film> = {
  reel: Film,
  post: Image,
  carousel: Layers,
  story: Smartphone,
};

const statusColors: Record<ContentItem["status"], string> = {
  draft: "bg-cool-steel/20 text-cool-steel",
  pending: "bg-gold/20 text-gold",
  approved: "bg-emerald/20 text-emerald",
  published: "bg-vintage-grape text-cool-steel",
  rejected: "bg-strawberry-red/20 text-strawberry-red",
};

export default function ContentCard({
  item, onApprove, onReject, onPublish, onRegenerate, onAlter, onDesign, onReschedule, onDelete, busy, compact,
}: ContentCardProps) {
  const Icon = typeIcons[item.type] || (item.svgCode ? Palette : Image);
  const [alterOpen, setAlterOpen] = useState(false);
  // Deleting also frees the stored artwork, so it asks once before doing it.
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Named examples, because the edit can now change structure and not just tone.
  function alterHint(type: ContentItem["type"]): string {
    if (type === "story") return "cut to one frame, say 10 days to go, new title...";
    if (type === "reel") return "make it 15 seconds, punchier hook, new hashtags...";
    if (type === "carousel") return "cut to 3 slides, rename it, funnier...";
    return "make it funnier, shorter, new hashtags, rename it...";
  }

  const [alterText, setAlterText] = useState("");
  const [designOpen, setDesignOpen] = useState(false);

  const submitAlter = async () => {
    if (!alterText.trim() || !onAlter) return;
    await onAlter(item.id, alterText.trim());
    setAlterText("");
    setAlterOpen(false);
  };

  return (
    <div className="border border-gold/10 bg-twilight-indigo/40 hover:bg-twilight-indigo/60 transition-all relative">
      {busy && (
        <div className="absolute inset-0 z-10 bg-ink-black/70 flex items-center justify-center">
          <Loader2 size={20} className="text-gold animate-spin" />
        </div>
      )}

      <div className="flex items-start gap-3 p-4 pb-2">
        <div className={`p-2 rounded-sm ${item.type === "reel" ? "bg-strawberry-red/15" : item.type === "carousel" ? "bg-emerald/15" : "bg-gold/15"}`}>
          <Icon size={16} className={item.type === "reel" ? "text-strawberry-red" : item.type === "carousel" ? "text-emerald" : "text-gold"} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-champagne truncate">{item.title}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-[10px] tracking-wider uppercase px-1.5 py-0.5 ${statusColors[item.status]}`}>
              {item.status === "approved" ? "scheduled" : item.status}
            </span>
            <span className="text-[10px] text-cool-steel">{getTimeAgo(item.createdAt)}</span>
            {item.type === "reel" && item.durationSec && (
              <span className="text-[10px] text-strawberry-red tabular-nums">
                {item.durationSec}s
              </span>
            )}
            {item.type === "story" && item.storyFrames && item.storyFrames.length > 0 && (
              <span className="text-[10px] text-gold tabular-nums">
                {item.storyFrames.length} {item.storyFrames.length === 1 ? "frame" : "frames"}
              </span>
            )}
            {item.agentId && (
              <span className="text-[10px] text-cool-steel/70 lowercase">via {item.agentId}</span>
            )}
          </div>
        </div>
      </div>

      {!compact && (
        <div className="px-4 py-2">
          {/* Artwork renders itself: each frame is drawn on demand by /api/preview. */}
          {item.svgCode ? (
            <div
              className="mb-2 rounded-sm overflow-hidden border border-gold/10 bg-ink-black"
              dangerouslySetInnerHTML={{ __html: item.svgCode }}
              style={{ maxHeight: 180 }}
            />
          ) : isVisual(item) ? (
            <div className="flex gap-1.5 mb-2 overflow-x-auto">
              {Array.from({ length: frameCount(item) }).map((_, i) => (
                <img
                  key={`${i}-${designKey(item)}`}
                  src={previewUrl(item, i)}
                  alt=""
                  loading="lazy"
                  className={`${item.type === "story" ? "h-64" : "h-44"} w-auto min-w-[11rem] rounded-sm border border-gold/15 shrink-0 bg-ink-black`}
                />
              ))}
            </div>
          ) : null}

          {item.storyFrames && item.storyFrames.length > 0 && (
            <div className="flex gap-1 mb-2">
              {item.storyFrames.map((_, i) => (
                <div key={i} className="flex-1 h-1.5 bg-gold/30 rounded-full" />
              ))}
            </div>
          )}

          <p className="text-xs text-cool-steel leading-relaxed line-clamp-4 whitespace-pre-wrap">
            {item.reelScript || item.caption}
          </p>

          {item.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.hashtags.slice(0, 5).map((tag) => (
                <span key={tag} className="text-[9px] text-gold/60">{tag}</span>
              ))}
              {item.hashtags.length > 5 && (
                <span className="text-[9px] text-cool-steel">+{item.hashtags.length - 5}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Design: switch template, or let freedom invent a new composition. */}
      {onDesign && isVisual(item) && !item.svgCode && item.status !== "published" && (
        <div className="border-t border-gold/10">
          <button
            onClick={() => setDesignOpen((v) => !v)}
            className={`w-full flex items-center justify-center gap-1.5 py-2 text-[11px] tracking-wider uppercase transition-colors ${
              designOpen ? "text-gold bg-gold/10" : "text-cool-steel hover:text-champagne hover:bg-gold/5"
            }`}
          >
            <LayoutTemplate size={13} /> design: {designLabel(item.design)}
          </button>
          {designOpen && (
            <div className="p-3 pt-1 space-y-2">
              <div className="flex gap-1.5">
                {(["auto", "template", "freedom"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      if (m === "freedom") onDesign(item.id, { mode: "freedom", seed: newSeed() });
                      else if (m === "template") onDesign(item.id, { mode: "template", template: item.design?.template || templateOptions[0].id });
                      else onDesign(item.id, { mode: "auto" });
                    }}
                    className={`flex-1 py-1.5 text-[10px] tracking-wider uppercase border ${
                      (item.design?.mode || "auto") === m
                        ? "border-gold text-gold bg-gold/10"
                        : "border-gold/15 text-cool-steel hover:text-champagne"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {item.design?.mode === "template" && (
                <select
                  value={item.design.template}
                  onChange={(e) => onDesign(item.id, { mode: "template", template: e.target.value })}
                  className="w-full bg-ink-black/60 border border-gold/20 px-2 py-1.5 text-xs text-champagne lowercase"
                >
                  {templateOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              )}
              {item.design?.mode === "freedom" && (
                <button
                  onClick={() => onDesign(item.id, { mode: "freedom", seed: newSeed() })}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] tracking-wider uppercase border border-gold/30 text-gold hover:bg-gold/10"
                >
                  <Dices size={13} /> new composition
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rework: a fresh take on the same brief, or a targeted edit. */}
      {(onRegenerate || onAlter) && item.status !== "published" && (
        <div className="border-t border-gold/10">
          <div className="flex">
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(item.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] tracking-wider uppercase text-cool-steel hover:text-champagne hover:bg-gold/5 transition-colors"
              >
                <RefreshCw size={13} /> regenerate
              </button>
            )}
            {onAlter && (
              <button
                onClick={() => setAlterOpen((v) => !v)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] tracking-wider uppercase transition-colors border-l border-gold/10 ${
                  alterOpen ? "text-gold bg-gold/10" : "text-cool-steel hover:text-champagne hover:bg-gold/5"
                }`}
              >
                <Wand2 size={13} /> alter
              </button>
            )}
          </div>

          {alterOpen && onAlter && (
            <div className="p-3 pt-0 flex gap-2">
              <input
                autoFocus
                value={alterText}
                onChange={(e) => setAlterText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAlter()}
                placeholder={alterHint(item.type)}
                className="flex-1 bg-ink-black/60 border border-gold/20 px-3 py-2 text-xs text-champagne placeholder:text-cool-steel/50 focus:outline-none focus:border-gold/50"
              />
              <button
                onClick={submitAlter}
                disabled={!alterText.trim()}
                className="px-3 bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 disabled:opacity-30 transition-colors"
              >
                <CornerDownLeft size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Approving schedules, so there is no separate approve-then-schedule step. */}
      {(onApprove || onReject) && item.status === "pending" && (
        <div className="flex border-t border-gold/10">
          {onApprove && (
            <button
              onClick={() => onApprove(item.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] tracking-wider uppercase text-emerald hover:bg-emerald/10 transition-colors"
            >
              <Check size={14} /> approve &amp; schedule
            </button>
          )}
          {onReject && (
            <button
              onClick={() => onReject(item.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] tracking-wider uppercase text-strawberry-red hover:bg-strawberry-red/10 transition-colors border-l border-gold/10"
            >
              <X size={14} /> reject
            </button>
          )}
        </div>
      )}

      {item.status === "approved" && (
        <div className="border-t border-gold/10 p-3">
          <div className="flex items-center gap-2 text-[11px] text-emerald">
            <CalendarClock size={14} />
            <span className="tracking-wider uppercase">
              {item.scheduledFor ? `posts ${formatSlot(item.scheduledFor)}` : "approved, not scheduled"}
            </span>
          </div>
          {onReschedule && (
            <input
              type="datetime-local"
              value={item.scheduledFor ? toLocalInput(item.scheduledFor) : ""}
              onChange={(e) => e.target.value && onReschedule(item.id, new Date(e.target.value).toISOString())}
              className="mt-2 w-full bg-ink-black/60 border border-gold/20 px-2 py-1.5 text-xs text-champagne"
            />
          )}
        </div>
      )}

      {/* Published items keep the action so a post that failed at Instagram,
          or one worth sending again, can be retried without regenerating. */}
      {onPublish && (item.status === "approved" || item.status === "published") && (
        <div className="border-t border-gold/10">
          <button
            onClick={() => onPublish(item.id)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] tracking-wider uppercase text-gold hover:bg-gold/10 transition-colors"
          >
            {item.status === "published" ? (
              <><RefreshCw size={14} /> publish again</>
            ) : (
              <><Send size={14} /> post now instead</>
            )}
          </button>
        </div>
      )}

      {onDelete && !compact && (
        <div className="border-t border-gold/10">
          {confirmDelete ? (
            <div className="flex">
              <button
                onClick={async () => {
                  setConfirmDelete(false);
                  await onDelete(item.id);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] tracking-wider uppercase text-strawberry-red bg-strawberry-red/10 hover:bg-strawberry-red/20 transition-colors"
              >
                <Trash2 size={13} /> delete for good
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 text-[11px] tracking-wider uppercase text-cool-steel hover:text-champagne transition-colors border-l border-gold/10"
              >
                keep it
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] tracking-wider uppercase text-cool-steel/70 hover:text-strawberry-red hover:bg-strawberry-red/5 transition-colors"
            >
              <Trash2 size={13} /> delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Strategy reports, calendars and hashtag sets are text, not artwork. */
const TEXT_ONLY_AGENTS = ["analytics-reporter", "competitor-scout", "content-calendar", "hashtag-strategist"];

function isVisual(item: ContentItem): boolean {
  if (item.agentId && TEXT_ONLY_AGENTS.includes(item.agentId)) return false;
  return !item.hashtags[0]?.startsWith("#strategy");
}

function frameCount(item: ContentItem): number {
  if (item.type === "carousel" && item.slides?.length) return Math.min(item.slides.length, 10);
  if (item.type === "story" && item.storyFrames?.length) return Math.min(item.storyFrames.length, 5);
  return 1;
}

function designKey(item: ContentItem): string {
  const d = item.design;
  return d ? `${d.mode}-${d.template || ""}-${d.seed ?? ""}-${d.artCount ?? 0}` : "auto";
}

function previewUrl(item: ContentItem, i: number): string {
  return `/api/preview?id=${encodeURIComponent(item.id)}&i=${i}&v=${encodeURIComponent(designKey(item))}`;
}

function designLabel(d?: DesignChoice): string {
  if (!d || d.mode === "auto") return "auto";
  if (d.mode === "freedom") return "freedom";
  return templateOptions.find((t) => t.id === d.template)?.label || "template";
}

function newSeed(): number {
  return Math.floor(Math.random() * 1e9);
}

function formatSlot(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
