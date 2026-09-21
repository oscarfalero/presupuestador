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
  name: string;
  details: string;
  clientName: string;
  date: string;
  /** Global VAT %, editable. Presets: 10 | 21. */
  ivaPct: number;
  chapters: Chapter[];
  items: BudgetItem[];
}

export const IVA_PRESETS = [10, 21] as const;

export function emptyBreakdown(): ItemBreakdown {
  return { materials: [], labor: { hours: 0, ratePerHour: 0 }, otherCost: 0, notes: "" };
}

export function createBudget(partial?: Partial<Budget>): Budget {
  return {
    id: crypto.randomUUID(),
    name: "Untitled budget",
    details: "",
    clientName: "",
    date: new Date().toISOString().slice(0, 10),
    ivaPct: 21,
    chapters: [],
    items: [],
    ...partial,
  };
}
