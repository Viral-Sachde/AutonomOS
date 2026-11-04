"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not sign in");
      } else {
        // Full navigation so middleware re-runs with the new cookie.
        window.location.href = next;
        return;
      }
    } catch {
      setError("Could not reach the server");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm border border-gold/15 bg-twilight-indigo/40 p-8"
      >
        <div className="mb-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.svg" alt="" width={44} height={44} className="mb-4 rounded-xl ring-1 ring-white/10" />
          <h1 className="text-3xl font-bold tracking-tight text-champagne leading-tight">
            Autonom<span className="text-gold">OS</span>
          </h1>
          <p className="text-[11px] tracking-[2px] uppercase text-cool-steel mt-2">
            AI company orchestration platform
          </p>
        </div>

        <label className="block text-[10px] tracking-[2px] uppercase text-cool-steel mb-1.5">
          id
        </label>
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoComplete="username"
          autoFocus
          className="w-full bg-ink-black/60 border border-gold/20 px-3 py-2.5 text-sm text-champagne focus:outline-none focus:border-gold/50 mb-4"
        />

        <label className="block text-[10px] tracking-[2px] uppercase text-cool-steel mb-1.5">
          password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full bg-ink-black/60 border border-gold/20 px-3 py-2.5 text-sm text-champagne focus:outline-none focus:border-gold/50 mb-5"
        />

        {error && (
          <p className="flex items-center gap-2 text-xs text-strawberry-red mb-4">
            <AlertCircle size={13} /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !user || !password}
          className="w-full flex items-center justify-center gap-2 py-3 bg-champagne text-ink-black text-sm font-bold tracking-wider lowercase hover:bg-gold transition-colors disabled:opacity-40"
          style={{ boxShadow: "3px 3px 0 #8b7bff" }}
        >
          {busy ? (
            <><Loader2 size={15} className="animate-spin" /> checking</>
          ) : (
            <><ShieldCheck size={15} /> sign in</>
          )}
        </button>
      </form>
    </div>
  );
}
