"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase";
import { useStrings } from "@/lib/locale";

function toMessage(code: string, t: ReturnType<typeof useStrings>): string {
  if (code.includes("Email not confirmed")) return t["auth.errorUnconfirmed"];
  if (code.includes("Invalid login credentials")) return t["auth.errorInvalid"];
  if (code.includes("fetch") || code.includes("network") || code.includes("Failed")) {
    return t["auth.errorNetwork"];
  }
  return t["auth.errorInvalid"];
}

/** Closed-beta sign-in: no public registration, accounts enter by invite. */
export function LoginForm() {
  const t = useStrings();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const client = getBrowserClient();
    if (!client) return;
    setBusy(true);
    setError(null);
    const { error: signInError } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(toMessage(signInError.message, t));
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  const inputCls =
    "w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400";

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">{t["auth.title"]}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t["auth.closedBeta"]}</p>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t["auth.email"]}</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t["auth.password"]}</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full cursor-pointer rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {t["auth.submit"]}
      </button>
    </form>
  );
}
