import type { Metadata } from "next";
import { Bot, Check, Download, Handshake, Radar, ShieldCheck, Sparkles, Wand2, Workflow, X } from "lucide-react";
import Ring, { Wordmark } from "@/components/site/Ring";
import { Card, Display, Eyebrow, Lead, Section } from "@/components/site/ui";
import { RING_PATH } from "@/lib/brand-geometry";
import { DEPARTMENTS } from "@/lib/departments";

export const metadata: Metadata = {
  title: "Brand guidelines",
  description: "The AutonomOS identity: the ring, colour, typography, texture and voice.",
};

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const CORE = [
  { name: "Ember", hex: "#E0584C", role: "The brand. The ring, primary actions, the one word that matters in a headline.", fg: "#ffffff" },
  { name: "Coal", hex: "#121110", role: "The canvas. Default background for every digital surface.", fg: "#F3EFEA" },
  { name: "Paper", hex: "#F3EFEA", role: "Text on Coal, and the light canvas for contrast sections.", fg: "#121110" },
];
const NEUTRALS = [
  { name: "Coal 2", hex: "#1A1918", role: "Cards" },
  { name: "Coal 3", hex: "#24221F", role: "Raised" },
  { name: "Smoke", hex: "#6F6A64", role: "Meta text" },
  { name: "Ash", hex: "#A29D97", role: "Body on Coal" },
  { name: "Bone", hex: "#E8E2D9", role: "Lines on Paper" },
];
const SUPPORT = [
  { name: "Ember Soft", hex: "#EE7A6F", role: "Ember text on Coal" },
  { name: "Ember Deep", hex: "#B8423A", role: "Pressed, gradients" },
];

const TYPE = [
  { label: "Display", spec: "Bricolage Grotesque 600 · 88 / 0.98 · -4.5%", cls: "font-display text-[48px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[72px]", sample: "Run the company." },
  { label: "Heading", spec: "Bricolage Grotesque 600 · 60 / 1.02 · -4.5%", cls: "font-display text-[36px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[48px]", sample: "Four teams. One brief." },
  { label: "Title", spec: "Bricolage Grotesque 600 · 26 / 1.1 · -3.5%", cls: "font-display text-[26px] font-semibold tracking-[-0.035em]", sample: "Competitor Watch" },
  { label: "Body", spec: "Hanken Grotesk 400 · 17 / 1.6 · 0", cls: "text-[17px] leading-[1.6] text-ash", sample: "The orchestrator releases a task only once the work it depends on is finished." },
  { label: "Label", spec: "JetBrains Mono 400 · 12 · +16% · uppercase", cls: "font-mono text-[12px] uppercase tracking-[0.16em] text-ash", sample: "Needs approval · 3 waiting" },
];

const VOICE: [string, string, string, string][] = [
  ["Plain over clever", "Say what the agent did and what happens next.", "Prospector found 25 accounts. Outreach starts Monday.", "Supercharge your pipeline with AI magic!"],
  ["Specific over vague", "Numbers, names and outcomes beat adjectives.", "Booked 4 demos from 120 emails.", "Drove meaningful engagement."],
  ["Calm over hype", "Confidence is quiet. No exclamation marks.", "Autonomous. Never unsupervised.", "The future of work is HERE!!"],
  ["Human in charge", "Agents prepare, people decide. Say so.", "Waiting for your approval.", "Fully hands-off, set and forget."],
];

const MISUSE = [
  { t: "Do not stretch", style: { transform: "scaleX(1.45)" } },
  { t: "Do not rotate", style: { transform: "rotate(45deg)" } },
  { t: "Do not outline", outline: true },
  { t: "Do not recolour", color: "#3b82f6" },
  { t: "No heavy effects", style: { filter: "drop-shadow(6px 6px 0 #f3efea)" } },
  { t: "Mind the contrast", bg: "#c94a3f" },
];

const FILES = [
  ["mark.svg", "App icon, Coal"], ["mark-paper.svg", "App icon, Paper"], ["mark-ember.svg", "App icon, Ember"],
  ["glyph.svg", "Ring, Ember"], ["glyph-paper.svg", "Ring, Paper"], ["glyph-charcoal.svg", "Ring, Coal"],
  ["wordmark-dark.svg", "Wordmark on dark"], ["wordmark-light.svg", "Wordmark on light"],
  ...DEPARTMENTS.map((d) => [`${d.id}.svg`, `${d.name} icon`]),
];

function Swatch({ name, hex, role, fg, tall }: { name: string; hex: string; role: string; fg?: string; tall?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/[0.07]">
      <div className={`flex flex-col justify-between p-5 ${tall ? "h-56" : "h-32"}`} style={{ background: hex, color: fg || "#F3EFEA" }}>
        <p className="font-display text-[22px] font-semibold tracking-[-0.03em]">{name}</p>
        <div className="font-mono text-[11.5px] opacity-80">
          <p>{hex}</p>
          <p>RGB {rgb(hex)}</p>
        </div>
      </div>
      <p className="bg-coal-2 p-4 text-[13px] leading-snug text-ash">{role}</p>
    </div>
  );
}

function Rule({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-12 flex items-baseline gap-4 border-b border-white/[0.07] pb-5">
      <span className="font-mono text-[12px] text-ember">{n}</span>
      <h2 className="font-display text-[30px] font-semibold tracking-[-0.04em] sm:text-[40px]">{title}</h2>
    </div>
  );
}

export default function BrandPage() {
  return (
    <>
      <section className="relative overflow-hidden px-4 pb-24 pt-16 md:px-8 md:pt-24">
        <div className="pointer-events-none absolute -right-20 top-0 h-[600px] w-[600px] rounded-full bg-ember opacity-[0.09] blur-[130px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <Eyebrow>Brand guidelines · v2.0</Eyebrow>
            <Display as="h1" className="mt-6">Warm machine. Calm power.</Display>
            <Lead className="mt-7 max-w-xl">
              AutonomOS runs a company of agents, so the brand has to feel trustworthy before it feels clever. One warm colour on a quiet charcoal, a soft geometric mark, and type that is contemporary without trying too hard.
            </Lead>
            <div className="mt-10 flex flex-wrap gap-3 font-mono text-[12px]">
              {["Logo", "Colour", "Type", "Texture", "Voice", "Downloads"].map((x, i) => (
                <a key={x} href={`#${x.toLowerCase()}`} className="rounded-full border border-white/10 px-3.5 py-1.5 text-ash hover:border-white/25 hover:text-paper-white">
                  0{i + 1} {x}
                </a>
              ))}
            </div>
          </div>
          <div className="mx-auto w-full max-w-[380px]">
            <Ring size="100%" lit glow id="brand-hero" />
          </div>
        </div>
      </section>

      {/* Logo */}
      <Section id="logo" className="border-t border-white/[0.06]">
        <Rule n="01" title="The ring" />
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-5 text-[16px] leading-relaxed text-ash">
            <p><span className="text-paper-white">The mark is an O with four soft lobes.</span> It is the O in AutonomOS and a picture of the product at once: the open centre is the orchestrator, the four lobes are the departments it delegates to.</p>
            <p>It is drawn from a circle pinched at the diagonals, with a superellipse opening. No straight lines, no sharp corners, so it reads as calm and organic even at 16 pixels.</p>
            <p>The wordmark is set lowercase in Bricolage Grotesque Bold with -4% tracking, with <span className="text-ember">OS</span> in Ember. Use the ring alone wherever the name is already present.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="flex aspect-square items-center justify-center"><Ring size={150} lit id="logo-a" /></Card>
            <div className="flex aspect-square items-center justify-center rounded-[22px] bg-paper-white"><Ring size={150} /></div>
            <Card className="col-span-full flex h-40 items-center justify-center"><Wordmark size={44} /></Card>
          </div>
        </div>

        <div className="mt-20 grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="font-display text-[24px] font-semibold tracking-[-0.03em]">Construction</h3>
            <p className="mt-2 text-[15px] text-ash">Outer form: r = 27 − 2.6·|sin 2θ|⁷ on a 64 unit grid. Opening: a superellipse, n = 3.1, 23.2 units wide.</p>
            <Card className="mt-6 flex items-center justify-center p-8">
              <svg viewBox="-4 -4 72 72" className="w-full max-w-[380px]" aria-label="Ring construction">
                <g stroke="#f3efea" strokeOpacity="0.18" strokeWidth="0.25" fill="none">
                  <circle cx="32" cy="32" r="27" strokeDasharray="1 1" />
                  <circle cx="32" cy="32" r="24.4" strokeDasharray="1 1" />
                  <rect x="20.4" y="20.4" width="23.2" height="23.2" strokeDasharray="1 1" />
                  <line x1="32" y1="-2" x2="32" y2="66" />
                  <line x1="-2" y1="32" x2="66" y2="32" />
                  <line x1="5" y1="5" x2="59" y2="59" />
                  <line x1="59" y1="5" x2="5" y2="59" />
                </g>
                <path fillRule="evenodd" fill="#e0584c" fillOpacity="0.88" d={RING_PATH} />
                <g fill="#f3efea" fontFamily="var(--font-jetbrains)" fontSize="2.2" opacity="0.7">
                  <text x="33" y="3.5">lobe · Marketing</text>
                  <text x="56" y="30.5">Sales</text>
                  <text x="33" y="63">Intelligence</text>
                  <text x="-2.5" y="30.5">Ops</text>
                  <text x="23" y="47">x = opening</text>
                </g>
              </svg>
            </Card>
          </div>
          <div>
            <h3 className="font-display text-[24px] font-semibold tracking-[-0.03em]">Clear space and size</h3>
            <p className="mt-2 text-[15px] text-ash">Keep clear space equal to the width of the opening (x) on every side. Never set the ring below 16 px, or the wordmark below 96 px wide.</p>
            <Card className="mt-6 flex items-center justify-center p-8">
              <div className="relative border border-dashed border-ember/40 p-10">
                <Ring size={120} />
                <span className="absolute left-1/2 top-2 -translate-x-1/2 font-mono text-[11px] text-ember">x</span>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[11px] text-ember">x</span>
                <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-ember">x</span>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-ember">x</span>
              </div>
            </Card>
            <div className="mt-3 grid grid-cols-4 items-end gap-3">
              {[16, 24, 40, 64].map((s) => (
                <Card key={s} className="flex flex-col items-center gap-3 py-5">
                  <Ring size={s} />
                  <span className="font-mono text-[11px] text-smoke">{s}px</span>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20">
          <h3 className="font-display text-[24px] font-semibold tracking-[-0.03em]">Misuse</h3>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {MISUSE.map((m) => (
              <div key={m.t} className="overflow-hidden rounded-[22px] border border-white/[0.07]">
                <div className="flex aspect-square items-center justify-center" style={{ background: m.bg || "#1a1918" }}>
                  {m.outline ? (
                    <svg viewBox="0 0 64 64" width={70}><path fillRule="evenodd" d={RING_PATH} fill="none" stroke="#e0584c" strokeWidth="1.6" /></svg>
                  ) : (
                    <span style={m.style}><Ring size={70} color={m.color || "#e0584c"} /></span>
                  )}
                </div>
                <p className="flex items-center gap-1.5 bg-coal-2 px-4 py-3 text-[12.5px] text-ash"><X size={13} className="text-ember" /> {m.t}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Colour */}
      <Section id="colour" className="border-t border-white/[0.06]">
        <Rule n="02" title="Colour" />
        <Lead className="max-w-2xl">Mostly Coal, with Paper for words and Ember used sparingly. Ember is a signal: if everything is coral, nothing is.</Lead>
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {CORE.map((c) => <Swatch key={c.name} {...c} tall />)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {[...NEUTRALS, ...SUPPORT].map((c) => <Swatch key={c.name} {...c} fg={["Bone", "Ash"].includes(c.name) ? "#121110" : undefined} />)}
        </div>

        <h3 className="mt-16 font-display text-[24px] font-semibold tracking-[-0.03em]">Proportion</h3>
        <div className="mt-5 flex h-16 overflow-hidden rounded-2xl border border-white/[0.07] font-mono text-[11px]">
          <div className="flex items-end bg-coal p-3 text-ash" style={{ width: "62%" }}>Coal 62</div>
          <div className="flex items-end bg-paper-white p-3 text-coal" style={{ width: "24%" }}>Paper 24</div>
          <div className="flex items-end bg-ember p-3 text-white" style={{ width: "9%" }}>9</div>
          {DEPARTMENTS.map((d) => <div key={d.id} style={{ width: "1.25%", background: d.color }} />)}
        </div>

        <h3 className="mt-16 font-display text-[24px] font-semibold tracking-[-0.03em]">Department colours</h3>
        <p className="mt-2 max-w-2xl text-[15px] text-ash">A secondary palette, warmed to sit with Ember. Use a department colour only where that department is the subject: its page, its chip, its node on the graph. Never for primary actions.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {DEPARTMENTS.map((d) => (
            <div key={d.id} className="overflow-hidden rounded-[22px] border border-white/[0.07]">
              <div className="flex h-36 items-center justify-center bg-coal-2"><Ring size={64} color={d.color} /></div>
              <div className="p-4" style={{ background: d.color, color: "#121110" }}>
                <p className="font-display text-[19px] font-semibold tracking-[-0.03em]">{d.name}</p>
                <p className="font-mono text-[11.5px] opacity-75">{d.color.toUpperCase()} · RGB {rgb(d.color)}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Type */}
      <Section id="type" className="border-t border-white/[0.06]">
        <Rule n="03" title="Typography" />
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { f: "font-display", n: "Bricolage Grotesque", u: "Display and headings", w: "600 · 700" },
            { f: "font-sans", n: "Hanken Grotesk", u: "Body and interface", w: "400 · 500 · 600" },
            { f: "font-mono", n: "JetBrains Mono", u: "Labels, data, agent ids", w: "400" },
          ].map((t) => (
            <Card key={t.n} className="p-7">
              <p className={`${t.f} text-[88px] font-semibold leading-none tracking-[-0.04em]`}>Aa</p>
              <p className={`${t.f} mt-6 text-[20px] font-semibold`}>{t.n}</p>
              <p className="mt-1 text-[14px] text-ash">{t.u}</p>
              <p className="mt-4 font-mono text-[11.5px] text-smoke">{t.w} · Google Fonts, OFL</p>
            </Card>
          ))}
        </div>
        <div className="mt-12 divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {TYPE.map((t) => (
            <div key={t.label} className="grid gap-3 py-8 md:grid-cols-[220px_1fr] md:items-baseline">
              <div>
                <p className="text-[15px] font-semibold">{t.label}</p>
                <p className="mt-1 font-mono text-[11px] text-smoke">{t.spec}</p>
              </div>
              <p className={t.cls}>{t.sample}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Texture */}
      <Section id="texture" className="border-t border-white/[0.06]">
        <Rule n="04" title="Texture, light and icons" />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[22px] bg-coal-2">
            <div className="absolute h-48 w-48 rounded-full bg-ember opacity-30 blur-3xl" />
            <Ring size={110} lit glow id="tex-a" />
            <p className="absolute bottom-4 left-4 font-mono text-[11px] text-ash">Ember glow, behind the subject</p>
          </div>
          <div className="grain-local relative flex aspect-[4/3] items-end overflow-hidden rounded-[22px] bg-coal-3 p-4">
            <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
            <p className="relative font-mono text-[11px] text-ash">Film grain at 7% over every surface</p>
          </div>
          <Card className="flex aspect-[4/3] flex-col justify-between p-6">
            <div className="grid grid-cols-4 gap-5 text-paper-white">
              {[Wand2, Sparkles, Handshake, Radar, Workflow, Bot, ShieldCheck, Check].map((I, i) => <I key={i} size={26} strokeWidth={1.6} />)}
            </div>
            <p className="font-mono text-[11px] text-ash">Lucide, 1.6 stroke, Paper or Ash. Ember for one icon at most.</p>
          </Card>
        </div>
        <ul className="mt-8 grid gap-3 text-[14.5px] text-ash md:grid-cols-3">
          <li><span className="text-paper-white">Radius.</span> 22 px for cards, 26 to 32 px for feature blocks, full pill for buttons and chips.</li>
          <li><span className="text-paper-white">Lines.</span> Hairlines at 6 to 8% Paper. No heavy borders, no drop shadows on UI.</li>
          <li><span className="text-paper-white">Motion.</span> Slow and soft: the ring breathes over 14 seconds. Honour reduced motion.</li>
        </ul>
      </Section>

      {/* Voice */}
      <Section id="voice" className="border-t border-white/[0.06]">
        <Rule n="05" title="Voice" />
        <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {VOICE.map(([t, b, yes, no]) => (
            <div key={t} className="grid gap-4 py-7 md:grid-cols-[1fr_1.2fr_1.2fr]">
              <div>
                <p className="font-display text-[22px] font-semibold tracking-[-0.03em]">{t}</p>
                <p className="mt-1 text-[14px] text-ash">{b}</p>
              </div>
              <p className="flex items-start gap-2.5 rounded-2xl bg-sales/[0.07] p-4 text-[15px]"><Check size={16} className="mt-0.5 shrink-0 text-sales" /> {yes}</p>
              <p className="flex items-start gap-2.5 rounded-2xl bg-ember/[0.07] p-4 text-[15px] text-ash"><X size={16} className="mt-0.5 shrink-0 text-ember" /> {no}</p>
            </div>
          ))}
        </div>
        <Card className="mt-6 flex flex-col gap-2 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-[20px] font-semibold tracking-[-0.03em]">House rule: no em dashes.</p>
          <p className="text-[14.5px] text-ash">Use a comma, a colon or a new sentence. This applies to product copy, docs and code comments.</p>
        </Card>
      </Section>

      {/* Downloads */}
      <Section id="downloads" className="border-t border-white/[0.06]">
        <Rule n="06" title="Downloads" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {FILES.map(([f, label]) => (
            <a key={f} href={`/brand/${f}`} download className="group overflow-hidden rounded-[22px] border border-white/[0.07] transition-colors hover:border-white/20">
              <div className={`flex h-32 items-center justify-center ${f.includes("paper") && !f.includes("glyph") || f === "wordmark-light.svg" || f === "glyph-charcoal.svg" ? "bg-paper-white" : "bg-coal-2"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/brand/${f}`} alt="" className={f.startsWith("wordmark") ? "w-[80%]" : "h-14 w-14"} />
              </div>
              <div className="flex items-center justify-between bg-coal-2 px-4 py-3">
                <span className="text-[12.5px] text-ash">{label}</span>
                <Download size={14} className="text-smoke group-hover:text-paper-white" />
              </div>
            </a>
          ))}
        </div>
        <p className="mt-6 text-[13px] text-smoke">SVG wordmarks reference Bricolage Grotesque by name. Install it from Google Fonts before using them in design tools, or use the ring with live text.</p>
      </Section>
    </>
  );
}
