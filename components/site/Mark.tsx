import { MARK_ECHO, MARK_ECHO_BANDS, MARK_MAIN, MARK_MAIN_BANDS, MARK_STARS, PALETTE } from "@/lib/brand-mark";

/**
 * The AutonomOS mark: one ribbon of nested colour bands flowing across a
 * night sky. `accent` recolours the centre band (used for department marks).
 * `shape` picks the rounded tile or the round porthole crop.
 */
export default function Mark({
  size = 32,
  accent,
  shape = "tile",
  id = "mk",
  className = "",
}: {
  size?: number | string;
  accent?: string;
  shape?: "tile" | "disc";
  id?: string;
  className?: string;
}) {
  const main = MARK_MAIN_BANDS.map(([c, w], i) => [i === MARK_MAIN_BANDS.length - 1 && accent ? accent : c, w] as const);
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <clipPath id={`${id}-clip`}>
          {shape === "tile" ? <rect width="64" height="64" rx="16" /> : <circle cx="32" cy="32" r="32" />}
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="64" height="64" fill={PALETTE.night} />
        {MARK_STARS.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={PALETTE.star} />)}
        {MARK_ECHO_BANDS.map(([c, w], i) => <path key={`e${i}`} d={MARK_ECHO} stroke={c} strokeWidth={w} strokeLinecap="round" fill="none" />)}
        {main.map(([c, w], i) => <path key={`m${i}`} d={MARK_MAIN} stroke={c} strokeWidth={w} strokeLinecap="round" fill="none" />)}
      </g>
    </svg>
  );
}

export function Wordmark({ size = 20, dark = true, id = "wm" }: { size?: number; dark?: boolean; id?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark size={size + 8} id={id} />
      <span className={`font-display font-bold tracking-[-0.04em] ${dark ? "text-cream" : "text-night"}`} style={{ fontSize: size }}>
        autonom<span className="text-teal">OS</span>
      </span>
    </span>
  );
}
