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
  number: string;
  details: string;
  clientName: string;
  address: string;
  date: string;
  ivaPct: number;
  intro: string;
  terms: string;
  payment: string;
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
    number: budget.number,
    details: budget.details,
    clientName: budget.clientName,
    address: budget.address,
    date: budget.date,
    ivaPct: budget.ivaPct,
    intro: budget.intro,
    terms: budget.terms,
    payment: budget.payment,
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
