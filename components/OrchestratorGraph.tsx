"use client";

import { DEPARTMENTS, type DeptId } from "@/lib/departments";
import { RING_PATH } from "@/lib/brand-geometry";

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
            <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#121110">{n}</text>
            <text x={x} y={y + (d.id === "intelligence" ? 42 : -32)} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.75">
              {d.name}
            </text>
          </g>
        );
      })}
      <circle cx="160" cy="160" r="46" fill="#e0584c" opacity="0.14" />
      <g transform="translate(122 122) scale(1.1875)">
        <path fillRule="evenodd" clipRule="evenodd" fill="#e0584c" d={RING_PATH}>
          {active.length > 0 && (
            <animateTransform attributeName="transform" type="rotate" values="0 32 32;10 32 32;0 32 32" dur="2.4s" repeatCount="indefinite" />
          )}
        </path>
      </g>
    </svg>
  );
}
