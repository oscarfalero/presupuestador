"use client";

import { useEffect } from "react";
import { useLocaleStore, useStrings } from "@/lib/locale";
import type { Locale } from "@/lib/i18n";

/** ES/EN segmented toggle. Keeps <html lang> in sync. */
export function LocaleToggle() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const t = useStrings();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const btn = (value: Locale, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setLocale(value)}
      aria-pressed={locale === value}
      aria-label={`${t["locale.label"]}: ${label}`}
      className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium ${
        locale === value
          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <span
      role="group"
      aria-label={t["locale.label"]}
      className="flex items-center gap-0.5 rounded-full border border-zinc-300 p-0.5 dark:border-zinc-700"
    >
      {btn("es", "ES")}
      {btn("en", "EN")}
    </span>
  );
}
