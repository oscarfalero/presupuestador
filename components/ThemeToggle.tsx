"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

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
 * Applied color scheme plus a toggler. Reads the theme through
 * useSyncExternalStore so server and client render the same snapshot —
 * no mount gate, no after-paint swap (next-themes sets the class before
 * hydration). Shared by the account menu theme row.
 */
export function useAppliedTheme(): { dark: boolean; toggle: () => void } {
  const { setTheme } = useTheme();
  const resolved = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot);
  const dark = resolved === "dark";
  return { dark, toggle: () => setTheme(dark ? "light" : "dark") };
}
