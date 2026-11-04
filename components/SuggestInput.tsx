"use client";

import { useEffect, useRef, useState } from "react";

interface SuggestOption {
  value: string;
  hint?: string;
}

interface SuggestInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SuggestOption[];
  placeholder?: string;
  className?: string;
}

/**
 * Native <input list> + <datalist> autocomplete does not reliably open its
 * suggestion popover on Android Chromium browsers (Chrome, Brave), so this
 * is a fully custom dropdown: still free text, still just a shortcut list.
 */
export default function SuggestInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  className,
}: SuggestInputProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const query = value.trim().toLowerCase();
  const filtered = query
    ? options.filter((o) => o.value.toLowerCase().includes(query))
    : options;

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-twilight-indigo border border-gold/20 shadow-xl">
          {filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => {
                // Fires before the input's blur, so the click always lands
                // even though blur would otherwise close this first.
                e.preventDefault();
                onChange(opt.value);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-champagne hover:bg-gold/10 transition-colors flex flex-col gap-0.5"
            >
              <span>{opt.value}</span>
              {opt.hint && (
                <span className="text-[10px] text-cool-steel/60">{opt.hint}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
