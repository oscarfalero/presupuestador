import { beforeEach, describe, expect, it } from "vitest";
import { useBudgetStore } from "./store";
import { renumber } from "./calc";
import { createBudget, type Budget, type BudgetItem } from "./budget-types";

function item(overrides: Partial<BudgetItem> & { id: string; chapterId: string }): BudgetItem {
  return {
    order: 0,
    code: "",
    title: "Item",
    description: "",
    um: "ud",
    quantity: 1,
    price: 10,
    ...overrides,
  };
}

function fixture(): Budget {
  return renumber(
    createBudget({
      id: "b-test",
      chapters: [
        { id: "c1", order: 0, title: "One" },
        { id: "c2", order: 1, title: "Two" },
      ],
      items: [
        item({ id: "a1", chapterId: "c1", order: 0 }),
        item({ id: "a2", chapterId: "c1", order: 1 }),
        item({ id: "b1", chapterId: "c2", order: 0 }),
      ],
    }),
  );
}

function codes(): [string, string][] {
  return useBudgetStore
    .getState()
    .budget.items.slice()
    .sort((x, y) => x.code.localeCompare(y.code, undefined, { numeric: true }))
    .map((i) => [i.id, i.code]);
}

beforeEach(() => {
  localStorage.clear();
  useBudgetStore.setState({ budget: fixture() });
});

describe("moveItem", () => {
  it("reorders within a chapter and renumbers", () => {
    // [a1, a2] -> move a1 after a2
    useBudgetStore.getState().moveItem("a1", "c1", 1);
    expect(codes()).toEqual([
      ["a2", "1.1"],
      ["a1", "1.2"],
      ["b1", "2.1"],
    ]);
  });

  it("moves across chapters", () => {
    useBudgetStore.getState().moveItem("a1", "c2", 0);
    expect(codes()).toEqual([
      ["a2", "1.1"],
      ["a1", "2.1"],
      ["b1", "2.2"],
    ]);
  });

  it("clamps out-of-range indices", () => {
    useBudgetStore.getState().moveItem("b1", "c1", 99);
    expect(codes()).toEqual([
      ["a1", "1.1"],
      ["a2", "1.2"],
      ["b1", "1.3"],
    ]);
    useBudgetStore.getState().moveItem("b1", "c2", -5);
    expect(codes()).toEqual([
      ["a1", "1.1"],
      ["a2", "1.2"],
      ["b1", "2.1"],
    ]);
  });

  it("ignores unknown item ids", () => {
    const before = codes();
    useBudgetStore.getState().moveItem("missing", "c1", 0);
    expect(codes()).toEqual(before);
  });
});

describe("chapters", () => {
  it("moveChapterTo reorders chapters and codes follow", () => {
    useBudgetStore.getState().moveChapterTo("c1", 1);
    expect(codes()).toEqual([
      ["b1", "1.1"],
      ["a1", "2.1"],
      ["a2", "2.2"],
    ]);
  });

  it("moveChapter steps one position", () => {
    useBudgetStore.getState().moveChapter("c2", -1);
    expect(codes()).toEqual([
      ["b1", "1.1"],
      ["a1", "2.1"],
      ["a2", "2.2"],
    ]);
  });

  it("removeChapter drops its items and renumbers", () => {
    useBudgetStore.getState().removeChapter("c1");
    const { budget } = useBudgetStore.getState();
    expect(budget.chapters.map((c) => c.id)).toEqual(["c2"]);
    expect(codes()).toEqual([["b1", "1.1"]]);
  });
});

describe("items CRUD", () => {
  it("addItem appends with defaults and a derived code", () => {
    const id = useBudgetStore.getState().addItem("c2");
    const added = useBudgetStore.getState().budget.items.find((i) => i.id === id);
    expect(added).toMatchObject({ um: "ud", quantity: 1, price: 0, code: "2.2" });
  });

  it("removeItem renumbers the chapter", () => {
    useBudgetStore.getState().removeItem("a1");
    expect(codes()).toEqual([
      ["a2", "1.1"],
      ["b1", "2.1"],
    ]);
  });
});

describe("breakdown", () => {
  it("updateBreakdown auto-creates and merges", () => {
    const { updateBreakdown } = useBudgetStore.getState();
    updateBreakdown("a1", { otherCost: 5 });
    updateBreakdown("a1", { labor: { hours: 2, ratePerHour: 30 } });
    const breakdown = useBudgetStore.getState().budget.items.find((i) => i.id === "a1")?.breakdown;
    expect(breakdown).toMatchObject({
      materials: [],
      labor: { hours: 2, ratePerHour: 30 },
      otherCost: 5,
      notes: "",
    });
  });

  it("manages materials", () => {
    const s = useBudgetStore.getState();
    s.addMaterial("a1");
    const materialId = useBudgetStore.getState().budget.items.find((i) => i.id === "a1")?.breakdown
      ?.materials[0].id as string;
    s.updateMaterial("a1", materialId, { description: "Screen", quantity: 2, price: 100 });
    let materials = useBudgetStore.getState().budget.items.find((i) => i.id === "a1")?.breakdown
      ?.materials;
    expect(materials).toHaveLength(1);
    expect(materials?.[0]).toMatchObject({ description: "Screen", quantity: 2, price: 100 });
    s.removeMaterial("a1", materialId);
    materials = useBudgetStore.getState().budget.items.find((i) => i.id === "a1")?.breakdown
      ?.materials;
    expect(materials).toHaveLength(0);
  });
});
