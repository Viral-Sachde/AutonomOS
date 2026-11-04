import { RING_PATH } from "@/lib/brand-geometry";

/**
 * The AutonomOS ring. The open centre is the orchestrator; the four lobes are
 * the departments it delegates to. Rendered inline so it can take any colour,
 * a soft gradient (`lit`) and a glow, as on the marketing site.
 */
export default function Ring({
  size = 32,
  color = "#e0584c",
  lit = false,
  glow = false,
  id = "ring",
  className = "",
  title,
}: {
  size?: number | string;
  color?: string;
  lit?: boolean;
  glow?: boolean;
  id?: string;
  className?: string;
  title?: string;
}) {
  const fill = lit ? `url(#${id}-g)` : color;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      style={glow ? { filter: `drop-shadow(0 0 28px ${color}55) drop-shadow(0 0 80px ${color}33)` } : undefined}
    >
      {title && <title>{title}</title>}
      {lit && (
        <defs>
          <radialGradient id={`${id}-g`} cx="34%" cy="28%" r="80%">
            <stop offset="0" stopColor="#f48a7f" />
            <stop offset="0.55" stopColor={color} />
            <stop offset="1" stopColor="#b8423a" />
          </radialGradient>
        </defs>
      )}
      <path fillRule="evenodd" clipRule="evenodd" fill={fill} d={RING_PATH} />
    </svg>
  );
}

export function Wordmark({ dark = true, size = 20 }: { dark?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Ring size={size + 6} />
      <span
        className={`font-display font-bold tracking-[-0.04em] ${dark ? "text-paper-white" : "text-coal"}`}
        style={{ fontSize: size }}
      >
        autonom<span className="text-ember">OS</span>
      </span>
    </span>
  );
}
