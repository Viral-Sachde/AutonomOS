"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Pause, Play, Send, CheckCircle2, AlertCircle, Clock, Film, Image as ImageIcon, Smartphone } from "lucide-react";
import type { ScheduledView, ItemStatus } from "@/lib/scheduled-creatives";

const slotMeta = {
  post: { label: "post", icon: ImageIcon },
  reel: { label: "reel", icon: Film },
  story: { label: "story", icon: Smartphone },
} as const;

const statusStyle: Record<ItemStatus, string> = {
  published: "text-emerald border-emerald/30",
  failed: "text-strawberry-red border-strawberry-red/40",
  due: "text-gold border-gold/40",
  missed: "text-strawberry-red border-strawberry-red/40",
  upcoming: "text-cool-steel border-gold/10",
};

function dayLabel(date: string): string {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
}

export default function CreativesPanel() {
  const [items, setItems] = useState<ScheduledView[]>([]);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/creatives");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load the schedule");
      setItems(data.items);
      setPaused(data.paused);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePause = async () => {
    setBusy("pause");
    await fetch("/api/creatives", { method: "POST", body: JSON.stringify({ paused: !paused }) });
    await load();
    setBusy(null);
  };

  const postNow = async (item: ScheduledView) => {
    if (!confirm(`Post "${item.title}" (${item.type}) to Instagram right now?`)) return;
    setBusy(item.id);
    const res = await fetch("/api/creatives", { method: "POST", body: JSON.stringify({ id: item.id }) });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Publish failed");
    await load();
    setBusy(null);
  };

  const days = Array.from(new Set(items.map((i) => i.date)));
  const counts = items.reduce<Record<string, number>>((a, i) => ({ ...a, [i.status]: (a[i.status] || 0) + 1 }), {});

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <div>
          <h2 className="font-serif italic text-3xl text-champagne">scheduled creatives</h2>
          <p className="text-sm text-cool-steel mt-1">
            One week of finished creatives, posted automatically: <span className="text-champagne">3pm post, 6pm reel, 8pm story</span> (IST).
          </p>
        </div>
        <button
          onClick={togglePause}
          disabled={busy === "pause"}
          className={`flex items-center gap-2 px-4 py-2 text-xs tracking-wider uppercase border transition-colors ${
            paused ? "border-strawberry-red/50 text-strawberry-red" : "border-emerald/40 text-emerald"
          }`}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? "paused: resume" : "auto-post on: pause"}
        </button>
      </div>

      {!loading && (
        <p className="text-[11px] tracking-wide text-cool-steel mb-6">
          {counts.published || 0} published · {counts.upcoming || 0} upcoming · {counts.due || 0} due now · {counts.missed || 0} missed · {counts.failed || 0} failed
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 border border-strawberry-red/40 bg-strawberry-red/10 text-strawberry-red text-sm p-3 mb-4">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <Loader2 className="animate-spin text-gold" />
      ) : (
        days.map((date) => (
          <section key={date} className="mb-6">
            <h3 className="text-[11px] tracking-[2px] uppercase text-gold mb-2">{dayLabel(date)}</h3>
            <div className="space-y-2">
              {items
                .filter((i) => i.date === date)
                .map((item) => {
                  const Icon = slotMeta[item.slot].icon;
                  const expanded = open === item.id;
                  return (
                    <div key={item.id} className="border border-gold/10 bg-twilight-indigo/30">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                        <button onClick={() => setOpen(expanded ? null : item.id)} className="flex items-center gap-3 flex-1 min-w-[220px] text-left">
                          <Icon size={16} className="text-gold shrink-0" />
                          <span className="text-xs tabular-nums text-cool-steel w-12 shrink-0">{item.time}</span>
                          <span className="text-[10px] tracking-wider uppercase text-cool-steel w-12 shrink-0">{slotMeta[item.slot].label}</span>
                          <span className="text-sm text-champagne truncate">{item.title}</span>
                        </button>
                        <span className={`text-[10px] tracking-wider uppercase border px-2 py-0.5 shrink-0 ${statusStyle[item.status]}`}>
                          {item.status === "published" && <CheckCircle2 size={10} className="inline mr-1 -mt-0.5" />}
                          {item.status === "upcoming" && <Clock size={10} className="inline mr-1 -mt-0.5" />}
                          {item.status}
                        </span>
                        {item.status !== "published" && (
                          <button
                            onClick={() => postNow(item)}
                            disabled={busy === item.id}
                            className="flex items-center gap-1.5 text-[11px] text-gold border border-gold/30 px-2.5 py-1 hover:bg-gold/10 disabled:opacity-50"
                          >
                            {busy === item.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            post now
                          </button>
                        )}
                      </div>

                      {expanded && (
                        <div className="flex flex-col sm:flex-row gap-4 p-3 border-t border-gold/10">
                          {item.type === "reel" ? (
                            <video src={`/api/creatives/media?id=${item.id}`} controls className="w-32 shrink-0 bg-ink-black" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/api/creatives/media?id=${item.id}`} alt={item.title} className="w-32 shrink-0 bg-ink-black" />
                          )}
                          <div className="text-sm text-cool-steel min-w-0">
                            <p className="whitespace-pre-wrap text-champagne/90">{item.caption}</p>
                            {item.type !== "story" && <p className="mt-3 text-gold/80 text-xs break-words">{item.hashtags.join(" ")}</p>}
                            {item.type === "story" && <p className="mt-3 text-[11px]">Instagram ignores captions on stories; the note above is for the sticker to add by hand.</p>}
                            {item.error && <p className="mt-3 text-xs text-strawberry-red">last error: {item.error}</p>}
                            {item.publishedAt && <p className="mt-3 text-xs text-emerald">posted {new Date(item.publishedAt).toLocaleString("en-IN")}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
