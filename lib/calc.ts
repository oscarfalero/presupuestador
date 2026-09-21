import type { Budget, BudgetItem } from "./budget-types";

export function itemAmount(item: Pick<BudgetItem, "quantity" | "price">): number {
  return round2(item.quantity * item.price);
}

export function chapterSubtotal(items: BudgetItem[], chapterId: string): number {
  return round2(
    items.filter((i) => i.chapterId === chapterId).reduce((acc, i) => acc + itemAmount(i), 0),
  );
}

export function budgetSubtotal(items: BudgetItem[]): number {
  return round2(items.reduce((acc, i) => acc + itemAmount(i), 0));
}

export function budgetTotalWithIva(subtotal: number, ivaPct: number): number {
  return round2(subtotal * (1 + ivaPct / 100));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Renumber chapters ("1", "2") and item codes ("1.1", "1.2", "2.1")
 * from explicit `order` fields. Orders are the source of truth;
 * codes are always derived.
 */
export function renumber(budget: Budget): Budget {
  const chapters = [...budget.chapters]
    .sort((a, b) => a.order - b.order)
    .map((c, idx) => ({ ...c, order: idx }));

  const chapterIndex = new Map<string, number>();
  chapters.forEach((c, idx) => chapterIndex.set(c.id, idx + 1));

  const items = [...budget.items].sort((a, b) => {
    const ca = chapterIndex.get(a.chapterId) ?? 0;
    const cb = chapterIndex.get(b.chapterId) ?? 0;
    if (ca !== cb) return ca - cb;
    return a.order - b.order;
  });

  const counters = new Map<string, number>();
  const renumbered = items.map((item) => {
    const chNum = chapterIndex.get(item.chapterId) ?? 0;
    const next = (counters.get(item.chapterId) ?? 0) + 1;
    counters.set(item.chapterId, next);
    return { ...item, code: chNum > 0 ? `${chNum}.${next}` : `${next}` };
  });

  return { ...budget, chapters, items: renumbered };
}

export function breakdownTotal(b: {
  materials: { quantity: number; price: number }[];
  labor: { hours: number; ratePerHour: number };
  otherCost: number;
}): number {
  const mats = b.materials.reduce((acc, m) => acc + m.quantity * m.price, 0);
  return round2(mats + b.labor.hours * b.labor.ratePerHour + b.otherCost);
}
