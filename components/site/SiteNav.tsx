"use client";

import { useEffect, useState } from "react";
import { Wordmark } from "./Mark";
import { DEPARTMENTS } from "@/lib/departments";

const LINKS = [
  { href: "/product", label: "Product" },
  { href: "/departments/marketing", label: "Departments" },
  { href: "/pricing", label: "Pricing" },
  { href: "/brand", label: "Brand" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${solid || open ? "bg-black" : "bg-[linear-gradient(180deg,rgba(0,0,0,0.7),transparent)]"}`}>
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <a href="/" aria-label="AutonomOS home"><Wordmark size={20} id="wm-nav" /></a>
        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[15px] text-cream/80 transition-colors hover:text-cream">{l.label}</a>
          ))}
          <a href="/dashboard#command" className="bg-cream px-4 py-2 text-[14px] font-semibold uppercase tracking-[0.06em] text-black transition-colors hover:bg-teal">Start</a>
        </nav>
        <button className="text-[14px] font-semibold uppercase tracking-[0.08em] text-cream md:hidden" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="h-[calc(100svh-4rem)] overflow-y-auto bg-black px-4 pb-8 md:hidden">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="block border-b border-cream/15 py-4 font-display text-[44px] font-bold uppercase leading-none tracking-[-0.04em] text-cream">{l.label}</a>
          ))}
          <div className="mt-6 grid grid-cols-2">
            {DEPARTMENTS.map((d) => (
              <a key={d.id} href={`/departments/${d.id}`} className="px-3 py-4 text-[16px] font-semibold text-black" style={{ background: d.color }}>{d.name}</a>
            ))}
          </div>
          <a href="/dashboard#command" className="mt-6 block bg-cream py-4 text-center text-[15px] font-semibold uppercase tracking-[0.06em] text-black">Start</a>
        </div>
      )}
    </header>
  );
}
