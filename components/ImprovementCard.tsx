"use client";

import { Improvement } from "@/lib/design-system";
import { GitBranch, Check, X, ArrowRight, Code2, Zap, Palette, Users, Gauge } from "lucide-react";

interface ImprovementCardProps {
  item: Improvement;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onPush?: (id: string) => void;
}

const categoryIcons: Record<Improvement["category"], typeof Users> = {
  ux: Users,
  feature: Zap,
  performance: Gauge,
  design: Palette,
  engagement: ArrowRight,
  concept: Code2,
};

const categoryColors: Record<Improvement["category"], string> = {
  ux: "text-gold bg-gold/15",
  feature: "text-emerald bg-emerald/15",
  performance: "text-cool-steel bg-cool-steel/15",
  design: "text-strawberry-red bg-strawberry-red/15",
  engagement: "text-champagne bg-champagne/10",
  concept: "text-gold bg-gold/10",
};

const priorityColors = {
  low: "text-cool-steel",
  medium: "text-gold",
  high: "text-strawberry-red",
  critical: "text-strawberry-red font-bold",
};

const statusBadge: Record<Improvement["status"], string> = {
  suggested: "bg-gold/20 text-gold",
  approved: "bg-emerald/20 text-emerald",
  pushed: "bg-vintage-grape text-cool-steel",
  rejected: "bg-strawberry-red/20 text-strawberry-red",
};

export default function ImprovementCard({ item, onApprove, onReject, onPush }: ImprovementCardProps) {
  const CatIcon = categoryIcons[item.category];

  return (
    <div className="border border-gold/10 bg-twilight-indigo/40 hover:bg-twilight-indigo/60 transition-all">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className={`p-2 rounded-sm ${categoryColors[item.category]}`}>
          <CatIcon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-champagne">{item.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] tracking-wider uppercase px-1.5 py-0.5 ${statusBadge[item.status]}`}>
              {item.status}
            </span>
            <span className={`text-[10px] tracking-wider uppercase ${priorityColors[item.priority]}`}>
              {item.priority}
            </span>
            <span className="text-[10px] tracking-wider uppercase text-cool-steel">
              {item.category}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 py-2">
        <p className="text-xs text-cool-steel leading-relaxed">{item.description}</p>

        {item.filesToChange && item.filesToChange.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.filesToChange.map((file) => (
              <span key={file} className="text-[10px] text-gold/80 bg-gold/8 px-1.5 py-0.5 font-mono">
                {file}
              </span>
            ))}
          </div>
        )}

        {item.codeChanges && (
          <details className="mt-2 group/code">
            <summary className="text-[10px] text-gold cursor-pointer flex items-center gap-1 tracking-wider uppercase hover:text-champagne">
              <Code2 size={12} /> view code change
            </summary>
            <pre className="mt-2 p-2 bg-ink-black/60 border border-gold/10 text-[10px] text-cool-steel overflow-x-auto whitespace-pre-wrap font-mono">
              {item.codeChanges}
            </pre>
          </details>
        )}
      </div>

      {/* Actions */}
      {item.status === "suggested" && (onApprove || onReject) && (
        <div className="flex border-t border-gold/10">
          {onApprove && (
            <button
              onClick={() => onApprove(item.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] tracking-wider uppercase text-emerald hover:bg-emerald/10 transition-colors"
            >
              <Check size={14} /> approve
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

      {item.status === "approved" && onPush && (
        <div className="border-t border-gold/10">
          <button
            onClick={() => onPush(item.id)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] tracking-wider uppercase text-gold hover:bg-gold/10 transition-colors"
          >
            <GitBranch size={14} /> push to game repo
          </button>
        </div>
      )}
    </div>
  );
}
