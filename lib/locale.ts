"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getStrings, type Locale, type StringKey } from "./i18n";

function browserLocale(): Locale {
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("en")) {
    return "en";
  }
  return "es";
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({ locale: browserLocale(), setLocale: (locale) => set({ locale }) }),
    { name: "presupuestador-locale" },
  ),
);

/** Typed UI dictionary for the current locale. */
export function useStrings(): Record<StringKey, string> {
  return getStrings(useLocaleStore((s) => s.locale));
}
