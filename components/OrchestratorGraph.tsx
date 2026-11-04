"use client";

import { DEPARTMENTS, type DeptId } from "@/lib/departments";

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
        return (
          <g key={d.id}>
            <line x1="160" y1="160" x2={x} y2={y} stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
            {live && <line x1="160" y1="160" x2={x} y2={y} stroke={d.color} strokeWidth="2.5" strokeLinecap="round" className="edge-live" />}
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
            <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#0b0b0e">{n}</text>
            <text x={x} y={y + (d.id === "intelligence" ? 42 : -32)} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.75">
              {d.name}
            </text>
          </g>
        );
      })}
      <circle cx="160" cy="160" r="34" fill="currentColor" />
      <circle cx="160" cy="160" r="12" fill="#7c5cff">
        {active.length > 0 && <animate attributeName="r" values="10;14;10" dur="1.2s" repeatCount="indefinite" />}
      </circle>
    </svg>
  );
}
