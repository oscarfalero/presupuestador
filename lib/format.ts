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
  const [int, frac] = Math.abs(n).toFixed(2).split(".");
  return `${sign}${groupInt(int, thousands)}${decimal}${frac}€`;
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
