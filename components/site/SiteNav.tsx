"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Wordmark } from "./Ring";
import { DEPARTMENTS } from "@/lib/departments";

const LINKS = [
  { href: "/product", label: "Product" },
  { href: "/departments/marketing", label: "Departments" },
  { href: "/pricing", label: "Pricing" },
  { href: "/brand", label: "Brand" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled || open ? "border-b border-white/[0.06] bg-coal/85 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <a href="/" aria-label="AutonomOS home">
          <Wordmark size={19} />
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-[14px] text-ash transition-colors hover:text-paper-white">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a href="/login" className="rounded-full px-4 py-2 text-[14px] text-ash transition-colors hover:text-paper-white">
            Sign in
          </a>
          <a
            href="/dashboard#command"
            className="inline-flex items-center gap-1.5 rounded-full bg-paper-white px-4 py-2 text-[14px] font-semibold text-coal transition-colors hover:bg-white"
          >
            Open the app <ArrowUpRight size={15} />
          </a>
        </div>

        <button
          className="-mr-2 rounded-full p-2 text-paper-white md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/[0.06] px-4 pb-6 pt-2 md:hidden">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="block border-b border-white/[0.06] py-3.5 font-display text-[22px] tracking-tight text-paper-white">
              {l.label}
            </a>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEPARTMENTS.map((d) => (
              <a key={d.id} href={`/departments/${d.id}`} className="flex items-center gap-2 rounded-xl border border-white/[0.06] px-3 py-2.5 text-[14px] text-ash">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} /> {d.name}
              </a>
            ))}
          </div>
          <a href="/dashboard#command" className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-ember py-3 text-[15px] font-semibold text-white">
            Open the app <ArrowUpRight size={16} />
          </a>
        </div>
      )}
    </header>
  );
}
