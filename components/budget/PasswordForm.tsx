"use client";

import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import { useStrings } from "@/lib/locale";

/** Password set/change for invited accounts (closed beta has no signup). */
export function PasswordForm() {
  const t = useStrings();
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const client = getBrowserClient();
    if (!client) return;
    setBusy(true);
    setNotice(null);
    const { error } = await client.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setNotice({ ok: false, text: t["auth.passwordError"] });
      return;
    }
    setPassword("");
    setNotice({ ok: true, text: t["auth.passwordSaved"] });
  }

  return (
    <section className="mb-6 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <h2 className="mb-2 text-sm font-semibold">{t["auth.setPassword"]}</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t["auth.newPassword"]}
          aria-label={t["auth.newPassword"]}
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400"
        />
        {notice ? (
          <p
            role={notice.ok ? "status" : "alert"}
            className={`text-sm ${notice.ok ? "text-green-700 dark:text-green-300" : "text-red-600 dark:text-red-400"}`}
          >
            {notice.text}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || password.length < 6}
          className="cursor-pointer self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {t["auth.setPassword"]}
        </button>
      </form>
    </section>
  );
}
