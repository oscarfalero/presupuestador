import { describe, expect, it } from "vitest";
import { createBudget, type Budget, type BudgetItem } from "./budget-types";
import {
  breakdownTotal,
  budgetSubtotal,
  budgetTotalWithIva,
  chapterSubtotal,
  isUnpriced,
  itemAmount,
  renumber,
  round2,
} from "./calc";

function item(overrides: Partial<BudgetItem> & { id: string; chapterId: string }): BudgetItem {
  return {
    order: 0,
    code: "",
    title: "Item",
    description: "",
    um: "ud",
    quantity: 1,
    price: 0,
    ...overrides,
  };
}

function budget(): Budget {
  return createBudget({
    chapters: [
      { id: "c1", order: 0, title: "One" },
      { id: "c2", order: 1, title: "Two" },
    ],
    items: [
      item({ id: "a1", chapterId: "c1", order: 0, quantity: 2, price: 100 }),
      item({ id: "a2", chapterId: "c1", order: 1, quantity: 1, price: 50 }),
      item({ id: "b1", chapterId: "c2", order: 0, quantity: 3, price: 10 }),
    ],
  });
}

describe("itemAmount", () => {
  it("multiplies qty x price with rounding", () => {
    expect(itemAmount({ quantity: 2, price: 100 })).toBe(200);
    expect(itemAmount({ quantity: 3, price: 19.99 })).toBe(59.97);
    expect(itemAmount({ quantity: 0, price: 999 })).toBe(0);
  });
});

describe("subtotals and VAT", () => {
  it("sums per chapter and overall", () => {
    const b = renumber(budget());
    expect(chapterSubtotal(b.items, "c1")).toBe(250);
    expect(chapterSubtotal(b.items, "c2")).toBe(30);
    expect(chapterSubtotal(b.items, "missing")).toBe(0);
    expect(budgetSubtotal(b.items)).toBe(280);
  });

  it("applies the global VAT presets", () => {
    expect(budgetTotalWithIva(1000, 21)).toBe(1210);
    expect(budgetTotalWithIva(1000, 10)).toBe(1100);
    expect(budgetTotalWithIva(0, 21)).toBe(0);
  });

  it("rounds half cents", () => {
    expect(round2(10.126)).toBe(10.13);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});

describe("renumber", () => {
  it("derives chapter codes from order", () => {
    const codes = renumber(budget()).items.map((i) => [i.id, i.code]);
    expect(codes).toEqual([
      ["a1", "1.1"],
      ["a2", "1.2"],
      ["b1", "2.1"],
    ]);
  });

  it("follows reordered chapters and items", () => {
    const b = budget();
    b.chapters = [
      { id: "c2", order: 0, title: "Two" },
      { id: "c1", order: 1, title: "One" },
    ];
    const codes = renumber(b).items.map((i) => [i.id, i.code]);
    expect(codes).toEqual([
      ["b1", "1.1"],
      ["a1", "2.1"],
      ["a2", "2.2"],
    ]);
  });

  it("handles empty chapters and zero qty/price", () => {
    const b = budget();
    b.chapters.push({ id: "c3", order: 2, title: "Empty" });
    const r = renumber(b);
    expect(r.items.filter((i) => i.chapterId === "c3")).toHaveLength(0);
    expect(budgetSubtotal(r.items)).toBe(280);
  });

  it("falls back gracefully for items with unknown chapters", () => {
    const b = budget();
    b.items.push(item({ id: "orphan", chapterId: "nope", order: 0 }));
    const orphan = renumber(b).items.find((i) => i.id === "orphan");
    expect(orphan?.code).toBe("1");
  });
});

describe("isUnpriced", () => {
  it("flags zero price or zero quantity", () => {
    expect(isUnpriced({ quantity: 1, price: 0 })).toBe(true);
    expect(isUnpriced({ quantity: 0, price: 100 })).toBe(true);
    expect(isUnpriced({ quantity: 0, price: 0 })).toBe(true);
    expect(isUnpriced({ quantity: 2, price: 50 })).toBe(false);
  });
});

describe("breakdownTotal", () => {
  it("sums materials + labor + other costs", () => {
    expect(
      breakdownTotal({
        materials: [
          { quantity: 1, price: 289 },
          { quantity: 2, price: 10.5 },
        ],
        labor: { hours: 4, ratePerHour: 35 },
        otherCost: 21,
      }),
    ).toBe(289 + 21 + 140 + 21);
  });

  it("handles an empty breakdown", () => {
    expect(
      breakdownTotal({ materials: [], labor: { hours: 0, ratePerHour: 0 }, otherCost: 0 }),
    ).toBe(0);
  });
});
