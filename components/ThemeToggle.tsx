"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useStrings } from "@/lib/locale";

function subscribeTheme(onChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => onChange();
  mq.addEventListener("change", onMedia);
  // next-themes applies the theme as a class on <html>; watching it covers
  // manual toggles, forced themes and OS changes alike.
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => {
    mq.removeEventListener("change", onMedia);
    obs.disconnect();
  };
}

function getThemeSnapshot(): "dark" | "light" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): "dark" | "light" {
  return "light";
}

/**
 * Sun/moon toggle. Reads the applied theme through useSyncExternalStore so
 * server and client render the same snapshot — no mount gate, no
 * after-paint swap (next-themes sets the class before hydration).
 */
export function ThemeToggle() {
  const { setTheme } = useTheme();
  const t = useStrings();
  const resolved = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot);

  const dark = resolved === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? t["theme.light"] : t["theme.dark"]}
      title={dark ? t["theme.light"] : t["theme.dark"]}
      className="cursor-pointer rounded-full border border-zinc-300 p-2 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
