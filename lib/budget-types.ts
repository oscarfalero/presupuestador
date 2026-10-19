export type UnitOfMeasure =
  | "ud"
  | "m"
  | "m2"
  | "m3"
  | "ml"
  | "kg"
  | "h"
  | "pa"
  | "%";

export const UNITS: UnitOfMeasure[] = [
  "ud",
  "m",
  "m2",
  "m3",
  "ml",
  "kg",
  "h",
  "pa",
  "%",
];

export interface MaterialCost {
  id: string;
  description: string;
  quantity: number;
  price: number;
  sourceUrl?: string;
  sourceLabel?: string;
}

export interface LaborCost {
  hours: number;
  ratePerHour: number;
}

/**
 * Internal-only breakdown explaining how an item price was reached.
 * Never shown to the client: editor mode only, excluded from client exports.
 */
export interface ItemBreakdown {
  materials: MaterialCost[];
  labor: LaborCost;
  otherCost: number;
  notes: string;
}

export interface BudgetItem {
  id: string;
  chapterId: string;
  order: number;
  /** Derived code, e.g. "2.3". Never edited manually. */
  code: string;
  title: string;
  description: string;
  um: UnitOfMeasure;
  quantity: number;
  /** Unit price in EUR. */
  price: number;
  breakdown?: ItemBreakdown;
}

export interface Chapter {
  id: string;
  order: number;
  title: string;
}

export interface Budget {
  id: string;
  /** Human-readable budget reference, e.g. 2026-001. User-overridable. */
  number: string;
  name: string;
  clientName: string;
  /** Site/client address (multiline). */
  address: string;
  date: string;
  /** Global VAT %, editable. Presets: 10 | 21. */
  ivaPct: number;
  ivaIncluded: boolean;
  /** Free-text document sections (optional, hidden when empty). */
  intro: string;
  terms: string;
  payment: string;
  /**
   * ISO timestamp of creation. Drives the budgets list order (newest
   * first, issue #62); never user-edited and never re-stamped on edit.
   * Absent on pre-#62 docs: rehydration derives a stable value from the
   * stored order (see `backfillCreatedAt` in `lib/store.ts`), so a stamp
   * may be synthetic — treat it as ordering metadata, not a real date.
   */
  createdAt?: string;
  /**
   * ISO timestamp of the last local edit. Absent for legacy docs —
   * unknown, never backfilled with an invented value (issue #56).
   */
  updatedAt?: string;
  chapters: Chapter[];
  items: BudgetItem[];
}

export const IVA_PRESETS = [10, 21] as const;

export function emptyBreakdown(): ItemBreakdown {
  return { materials: [], labor: { hours: 0, ratePerHour: 0 }, otherCost: 0, notes: "" };
}

/**
 * Generates an RFC 4122 v4 UUID. Uses `crypto.randomUUID()` in secure
 * contexts (`localhost` / HTTPS) and falls back to `crypto.getRandomValues`
 * over plain HTTP on LAN IPs (where `crypto.randomUUID` is unavailable).
 */
export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createBudget(partial?: Partial<Budget>): Budget {
  return {
    id: uid(),
    number: "",
    name: "Untitled budget",
    clientName: "",
    address: "",
    date: new Date().toISOString().slice(0, 10),
    ivaPct: 21,
    ivaIncluded: true,
    intro: "",
    terms: "",
    payment: "",
    createdAt: new Date().toISOString(),
    chapters: [],
    items: [],
    ...partial,
  };
}
