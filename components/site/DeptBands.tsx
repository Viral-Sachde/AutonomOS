"use client";

import { useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { DeptWidget } from "./demos";
import { DEPARTMENTS, type DeptId } from "@/lib/departments";

/**
 * The four departments as flat poster bands in their own colour. One is open
 * at a time and shows its live widget; hovering a closed band nudges it open
 * a little so it feels physical.
 */
export default function DeptBands() {
  const [open, setOpen] = useState<DeptId>("marketing");
  return (
    <section>
      {DEPARTMENTS.map((d) => {
        const on = open === d.id;
        return (
          <div key={d.id} style={{ background: d.color }} className="text-black">
            <button
              onClick={() => setOpen(d.id)}
              aria-expanded={on}
              className="group flex w-full items-end justify-between gap-4 px-4 pb-3 pt-6 text-left md:px-8"
            >
              <span className="font-display text-[15vw] font-bold uppercase leading-[0.8] tracking-[-0.06em] transition-transform duration-500 group-hover:translate-x-3 md:text-[10vw]">
                {d.name}
              </span>
              <span className="mb-[1.2vw] flex items-center gap-3">
                <span className="hidden text-[14px] font-semibold uppercase tracking-[0.1em] md:inline">{d.blurb}</span>
                <Plus size={34} className={`shrink-0 transition-transform duration-500 ${on ? "rotate-45" : ""}`} />
              </span>
            </button>
            <div className="grid transition-[grid-template-rows] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
              <div className="overflow-hidden">
                <div className="grid gap-6 px-4 pb-8 pt-4 md:grid-cols-[1fr_2.2fr] md:px-8 md:pb-10">
                  <div className="flex flex-col justify-between gap-6">
                    <ul className="space-y-1">
                      {d.agents.map((a) => (
                        <li key={a.id} className="font-display text-[22px] font-semibold leading-tight tracking-[-0.03em] md:text-[28px]">{a.name}</li>
                      ))}
                    </ul>
                    <a href={`/departments/${d.id}`} className="inline-flex w-fit items-center gap-2 border-b-2 border-black pb-1 text-[15px] font-semibold uppercase tracking-[0.06em]">
                      Explore <ArrowUpRight size={16} />
                    </a>
                  </div>
                  <div className="bg-black p-4 text-cream md:p-6">{on && <DeptWidget id={d.id} />}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
