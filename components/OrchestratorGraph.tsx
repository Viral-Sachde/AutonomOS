"use client";

import { DEPARTMENTS, type DeptId } from "@/lib/departments";
import { useId } from "react";
import { MARK_ECHO, MARK_ECHO_BANDS, MARK_MAIN, MARK_MAIN_BANDS, MARK_STARS, PALETTE } from "@/lib/brand-mark";

/**
 * The orchestration layer as a picture: one core node and the four
 * departments it delegates to. Edges animate while that department has
 * running work, so the graph doubles as a live status view.
 */
export default function OrchestratorGraph({
  active = [],
  counts = {},
  size = 320,
}: {
  active?: DeptId[];
  counts?: Partial<Record<DeptId, number>>;
  size?: number;
}) {
  const pos: Record<DeptId, [number, number]> = {
    marketing: [160, 46],
    sales: [274, 160],
    intelligence: [160, 274],
    operations: [46, 160],
  };
  const clip = `og-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 320 320" width="100%" style={{ maxWidth: size }} role="img" aria-label="Orchestrator and its four departments">
      <circle cx="160" cy="160" r="114" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" />
      <circle cx="160" cy="160" r="70" fill="none" stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="2 6" />
      {DEPARTMENTS.map((d) => {
        const [x, y] = pos[d.id];
        const live = active.includes(d.id);
        // Edges start at the ring's rim, not its open centre.
        const sx = 160 + (x - 160) * 0.4;
        const sy = 160 + (y - 160) * 0.4;
        return (
          <g key={d.id}>
            <line x1={sx} y1={sy} x2={x} y2={y} stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
            {live && <line x1={sx} y1={sy} x2={x} y2={y} stroke={d.color} strokeWidth="2.5" strokeLinecap="round" className="edge-live" />}
          </g>
        );
      })}
      {DEPARTMENTS.map((d) => {
        const [x, y] = pos[d.id];
        const live = active.includes(d.id);
        const n = counts[d.id] || 0;
        return (
          <g key={d.id + "n"}>
            {live && (
              <circle cx={x} cy={y} r="30" fill={d.color} opacity="0.18">
                <animate attributeName="r" values="24;34;24" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={x} cy={y} r="22" fill={d.color} />
            <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#121827">{n}</text>
            <text x={x} y={y + (d.id === "intelligence" ? 42 : -32)} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.75">
              {d.name}
            </text>
          </g>
        );
      })}
      <circle cx="160" cy="160" r="50" fill="#7cc4b8" opacity="0.12">
        {active.length > 0 && <animate attributeName="r" values="44;54;44" dur="2.4s" repeatCount="indefinite" />}
      </circle>
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g transform="translate(122 122) scale(1.1875)">
        <g clipPath={`url(#${clip})`}>
          <rect width="64" height="64" fill={PALETTE.night} />
          {MARK_STARS.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={PALETTE.star} />)}
          {MARK_ECHO_BANDS.map(([c, w], i) => <path key={`e${i}`} d={MARK_ECHO} stroke={c} strokeWidth={w} strokeLinecap="round" fill="none" />)}
          {MARK_MAIN_BANDS.map(([c, w], i) => <path key={`m${i}`} d={MARK_MAIN} stroke={c} strokeWidth={w} strokeLinecap="round" fill="none" />)}
        </g>
        <circle cx="32" cy="32" r="31.5" fill="none" stroke="#ede4cf" strokeOpacity="0.25" />
      </g>
    </svg>
  );
}
