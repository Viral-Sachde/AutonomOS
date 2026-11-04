"use client";

import { useCallback, useEffect, useState } from "react";

const EVENT = "autonomos:store";

/**
 * useState that is mirrored to localStorage and shared between components on
 * the same page (the orchestrator writes tasks, the operations board reads
 * them). Storage can be unavailable in private windows, so every access is
 * guarded and the seed value is always a valid fallback.
 */
export function useLocalState<T>(key: string, seed: T): [T, (next: T | ((prev: T) => T)) => void] {
  const storageKey = `autonomos.${key}`;
  const [value, setValue] = useState<T>(seed);

  useEffect(() => {
    const load = () => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) setValue(JSON.parse(raw) as T);
      } catch {
        /* keep the seed */
      }
    };
    load();
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === storageKey) load();
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [storageKey]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(resolved));
          queueMicrotask(() => window.dispatchEvent(new CustomEvent(EVENT, { detail: storageKey })));
        } catch {
          /* in-memory only */
        }
        return resolved;
      });
    },
    [storageKey],
  );

  return [value, update];
}

/** Clears every AutonomOS demo key so the modules return to their seed data. */
export function resetDemoData() {
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith("autonomos."))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* nothing stored */
  }
  window.location.reload();
}
