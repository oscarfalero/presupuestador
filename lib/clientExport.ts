import { budgetSubtotal, budgetTotalWithIva, chapterSubtotal, itemAmount, round2 } from "./calc";
import type { Budget } from "./budget-types";

export interface ClientItemRow {
  code: string;
  title: string;
  description: string;
  um: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface ClientChapter {
  number: number;
  title: string;
  items: ClientItemRow[];
  subtotal: number;
}

export interface ClientBudget {
  name: string;
  details: string;
  clientName: string;
  date: string;
  ivaPct: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  chapters: ClientChapter[];
}

/**
 * Client-safe export model. The internal `ItemBreakdown` (materials,
 * source URLs, labor rates, notes) is deliberately never mapped here,
 * so neither the Excel nor the PDF export can leak it.
 */
export function toClientBudget(budget: Budget): ClientBudget {
  const chapters = [...budget.chapters].sort((a, b) => a.order - b.order);
  const subtotal = budgetSubtotal(budget.items);
  return {
    name: budget.name,
    details: budget.details,
    clientName: budget.clientName,
    date: budget.date,
    ivaPct: budget.ivaPct,
    subtotal,
    vatAmount: round2(subtotal * (budget.ivaPct / 100)),
    total: budgetTotalWithIva(subtotal, budget.ivaPct),
    chapters: chapters.map((ch, idx) => ({
      number: idx + 1,
      title: ch.title,
      items: budget.items
        .filter((i) => i.chapterId === ch.id)
        .sort((a, b) => a.order - b.order)
        .map((i) => ({
          code: i.code,
          title: i.title,
          description: i.description,
          um: i.um,
          quantity: i.quantity,
          price: i.price,
          amount: itemAmount(i),
        })),
      subtotal: chapterSubtotal(budget.items, ch.id),
    })),
  };
}
