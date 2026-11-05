"use client";

import { useEffect, useRef, useState } from "react";
import Mark from "./Mark";
import { DEPARTMENTS, type DeptId } from "@/lib/departments";

/**
 * The "how it works" story, told with ribbons instead of paragraphs.
 *
 * A tall section with a sticky stage. Scroll progress draws ribbons built
 * like the logo (stacked strokes, widest first): a goal flows into the core
 * (Plan), out to each department (Delegate), between departments in order
 * (Coordinate), and finally around the whole company (Track).
 */

const BANDS: [string, number][] = [["#2A2D33", 46], ["#9C6B47", 36], ["#4FA89B", 28], ["#EDE4CF", 19], ["#4FA89B", 12.5], ["#EDE4CF", 9.5]];
const color = (id: DeptId) => DEPARTMENTS.find((d) => d.id === id)!.color;

const NODES: Record<DeptId, [number, number]> = {
  marketing: [230, 190],
  sales: [820, 230],
  intelligence: [800, 800],
  operations: [210, 790],
};

const PLAN = "M-60 520 C 120 520 220 360 380 430 S 470 520 500 500";
const OUT: Record<DeptId, string> = {
  marketing: "M500 500 C 420 420 330 300 230 190",
  sales: "M500 500 C 600 420 700 330 820 230",
  intelligence: "M500 500 C 600 600 690 700 800 800",
  operations: "M500 500 C 400 600 320 690 210 790",
};
const CHAIN = "M800 800 C 980 560 560 80 230 190 C 60 250 640 20 820 230 C 1000 440 420 1000 210 790";
const LOOP = "M500 130 A 370 370 0 1 1 499.9 130";

const STEPS = [
  { word: "Plan", line: "One sentence in." },
  { word: "Delegate", line: "Out to 22 specialists." },
  { word: "Coordinate", line: "In the right order." },
  { word: "Track", line: "You approve. It ships." },
];

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

function Ribbon({ d, t, accent, scale = 1 }: { d: string; t: number; accent: string; scale?: number }) {
  if (t <= 0) return null;
  return (
    <g>
      {[...BANDS, [accent, 5.5] as [string, number]].map(([c, w], i) => (
        <path key={i} d={d} pathLength={1} stroke={c} strokeWidth={w * scale} strokeLinecap="round" fill="none" strokeDasharray="1 1" strokeDashoffset={1 - t} />
      ))}
    </g>
  );
}

export default function FlowStory() {
  const ref = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setP(clamp(-r.top / (r.height - window.innerHeight)));
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);

  const step = Math.min(3, Math.floor(p * 4 * 0.999));
  const plan = seg(p, 0.02, 0.22);
  const outs = DEPARTMENTS.map((d, i) => seg(p, 0.27 + i * 0.04, 0.42 + i * 0.04));
  const chain = seg(p, 0.52, 0.74);
  const loop = seg(p, 0.78, 0.97);

  return (
    <section ref={ref} className="relative h-[460vh] bg-black">
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden md:flex-row">
        <div className="relative z-10 flex flex-col justify-between gap-6 px-4 pb-6 pt-20 md:w-[44%] md:px-8 md:pb-10">
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <span key={s.word} className={`h-1 flex-1 transition-colors duration-500 ${i <= step ? "bg-cream" : "bg-cream/15"}`} />
            ))}
          </div>
          <div>
            <p className="font-display text-[14px] font-bold text-teal">0{step + 1}</p>
            <div className="relative h-[14vw] overflow-hidden md:h-[7vw]">
              {STEPS.map((s, i) => (
                <p
                  key={s.word}
                  className="absolute inset-x-0 top-0 font-display text-[13vw] font-bold uppercase leading-[1] tracking-[-0.06em] transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] md:text-[6.1vw]"
                  style={{ transform: `translateY(${(i - step) * 105}%)` }}
                >
                  {s.word}
                </p>
              ))}
            </div>
            <p className="mt-3 text-[18px] text-mist md:text-[22px]">{STEPS[step].line}</p>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
            {Array.from({ length: 70 }, (_, i) => (
              <circle key={i} cx={(i * 137.5) % 1000} cy={(i * 293.1) % 1000} r={i % 7 === 0 ? 2.4 : 1.3} fill="#F5F1E6" opacity={0.5} />
            ))}
            <Ribbon d={LOOP} t={loop} accent="#6E8CCB" scale={0.7} />
            <Ribbon d={CHAIN} t={chain} accent="#E3C77E" scale={0.55} />
            {DEPARTMENTS.map((d, i) => <Ribbon key={d.id} d={OUT[d.id]} t={outs[i]} accent={d.color} scale={0.75} />)}
            <Ribbon d={PLAN} t={plan} accent="#6E8CCB" />
            {DEPARTMENTS.map((d, i) => {
              const [x, y] = NODES[d.id];
              const on = outs[i] >= 0.98;
              return (
                <g key={d.id} style={{ transform: `translate(${x}px, ${y}px) scale(${on ? 1 : 0})`, transition: "transform .5s cubic-bezier(.3,1.6,.5,1)" }}>
                  <circle r="78" fill={color(d.id)} />
                  <text textAnchor="middle" y="8" fontSize={d.name.length > 9 ? 21 : 27} fontWeight="700" fill="#050505" style={{ fontFamily: "var(--font-bricolage)", letterSpacing: "-0.03em" }}>{d.name}</text>
                </g>
              );
            })}
          </svg>
          <div
            className="absolute left-1/2 top-1/2 aspect-square w-[17%] transition-transform duration-500"
            style={{ transform: `translate(-50%, -50%) scale(${plan >= 0.98 ? 1 : 0.6}) rotate(${p * 90}deg)` }}
          >
            <Mark size="100%" shape="disc" id="flow-core" />
          </div>
          <div className={`absolute bottom-6 right-4 text-right transition-opacity duration-500 md:right-8 ${loop > 0.9 ? "opacity-100" : "opacity-0"}`}>
            <p className="font-display text-[64px] font-bold leading-none tracking-[-0.05em] text-cream md:text-[96px]">5/5</p>
            <p className="text-[14px] uppercase tracking-[0.12em] text-mist">tasks shipped</p>
          </div>
        </div>
      </div>
    </section>
  );
}
