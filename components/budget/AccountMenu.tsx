"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyStore } from "@/lib/company";
import { getBrowserClient, isCloudEnabled } from "@/lib/supabase";
import { useStrings } from "@/lib/locale";
import { useAppliedTheme } from "@/components/ThemeToggle";

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h13M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="19" cy="18" r="2" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

/**
 * Round profile button (company initial, generic silhouette when empty)
 * with an account dropdown: Account, Preferences and an in-place theme
 * toggle. Future home of multi-account switching.
 */
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function AccountMenu() {
  const name = useCompanyStore((s) => s.profile.name);
  const t = useStrings();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const { dark, toggle } = useAppliedTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const initial = name.trim().charAt(0).toUpperCase();
  const itemCls =
    "flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t["account.menu"]}
        title={t["account.menu"]}
        className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-sm font-semibold text-zinc-700 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
      >
        {initial || <UserIcon />}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className={itemCls}>
            <UserIcon />
            {t["account.title"]}
          </Link>
          <Link role="menuitem" href="/account/preferences" onClick={() => setOpen(false)} className={itemCls}>
            <SlidersIcon />
            {t["account.preferences"]}
          </Link>
          <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              toggle();
              setOpen(false);
            }}
            className={itemCls}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
            {dark ? t["theme.light"] : t["theme.dark"]}
          </button>
          {isCloudEnabled() ? (
            <>
              <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
              <button
                role="menuitem"
                type="button"
                disabled={signingOut}
                onClick={async () => {
                  const client = getBrowserClient();
                  if (!client) return;
                  setSigningOut(true);
                  await client.auth.signOut();
                  setOpen(false);
                  router.replace("/login");
                }}
                className={itemCls}
              >
                <LogoutIcon />
                {signingOut ? t["auth.signingOut"] : t["auth.logout"]}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
