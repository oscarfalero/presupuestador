import type { Locale } from "./i18n";

const SEPS: Record<Locale, { thousands: string; decimal: string }> = {
  es: { thousands: ".", decimal: "," },
  en: { thousands: ",", decimal: "." },
};

function groupInt(int: string, thousands: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
}

/**
 * Money for display: grouped thousands, exactly 2 decimals, € suffix in
 * both UI languages (es: 1.234,56€ · en: 1,234.56€). Implemented
 * manually so output is identical in every JS engine (Node test/SSR
 * environments often ship minimal ICU data where Intl grouping
 * silently disappears).
 */
export function formatMoney(n: number, locale: Locale): string {
  const { thousands, decimal } = SEPS[locale];
  const sign = n < 0 ? "-" : "";
  // frac defaults for exponential notation (1e21), where toFixed
  // returns no decimal point.
  const [int, frac = "00"] = Math.abs(n).toFixed(2).split(".");
  return `${sign}${groupInt(int, thousands)}${decimal}${frac}€`;
}

/**
 * Budget date for display (issue #38): the model stays ISO
 * (`YYYY-MM-DD`) so sorting/storage is unaffected; only presentation
 * is reordered — es: `DD/MM/YYYY`, en: `MM/DD/YYYY`. Manual surgery
 * (same rationale as formatMoney: identical in every JS engine).
 * Empty/invalid input falls back to the raw string, never throws.
 */
export function formatDate(iso: string, locale: Locale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return iso;
  const [, y, mo, d] = m;
  return locale === "es" ? `${d}/${mo}/${y}` : `${mo}/${d}/${y}`;
}

/**
 * Quantities (qty, hours): grouped thousands, entered decimals untouched.
 */
export function formatQty(n: number, locale: Locale): string {
  const { thousands, decimal } = SEPS[locale];
  const [int, frac] = String(n).split(".");
  const grouped = groupInt(int, thousands);
  return frac !== undefined ? `${grouped}${decimal}${frac}` : grouped;
}

/**
 * Last-modified stamp for display (issue #56): day + short month + year
 * + time in the active locale (es: "7 oct 2026, 14:32"). Unparseable
 * input falls back to the raw string, never throws (legacy data).
 */
export function formatDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return iso;
  }
}
