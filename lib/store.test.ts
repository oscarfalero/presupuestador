import { beforeEach, describe, expect, it } from "vitest";
import { mergePersistedState, selectActiveBudget, useBudgetStore } from "./store";
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

function active(): Budget {
  const b = selectActiveBudget(useBudgetStore.getState());
  if (!b) throw new Error("no active budget");
  return b;
}

function codes(): [string, string][] {
  return active()
    .items.slice()
    .sort((x, y) => x.code.localeCompare(y.code, undefined, { numeric: true }))
    .map((i) => [i.id, i.code]);
}

beforeEach(() => {
  localStorage.clear();
  useBudgetStore.setState({
    budgets: { "b-test": fixture() },
    order: ["b-test"],
    activeId: "b-test",
    lastDeleted: null,
  });
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
    expect(active().chapters.map((c) => c.id)).toEqual(["c2"]);
    expect(codes()).toEqual([["b1", "1.1"]]);
  });
});

describe("items CRUD", () => {
  it("addItem appends with defaults and a derived code", () => {
    const id = useBudgetStore.getState().addItem("c2", "Gadget");
    const added = active().items.find((i) => i.id === id);
    expect(added).toMatchObject({ title: "Gadget", um: "ud", quantity: 1, price: 0, code: "2.2" });
  });

  it("removeItem renumbers the chapter", () => {
    useBudgetStore.getState().removeItem("a1");
    expect(codes()).toEqual([
      ["a2", "1.1"],
      ["b1", "2.1"],
    ]);
  });
});

describe("undo delete", () => {
  it("restores a deleted item at its position", () => {
    const s = useBudgetStore.getState();
    s.removeItem("a1");
    expect(codes()).toEqual([
      ["a2", "1.1"],
      ["b1", "2.1"],
    ]);
    expect(useBudgetStore.getState().undoDelete()).toBe(true);
    expect(codes()).toEqual([
      ["a1", "1.1"],
      ["a2", "1.2"],
      ["b1", "2.1"],
    ]);
    expect(useBudgetStore.getState().lastDeleted).toBeNull();
  });

  it("restores a deleted chapter with its items", () => {
    useBudgetStore.getState().removeChapter("c1");
    expect(codes()).toEqual([["b1", "1.1"]]);
    expect(useBudgetStore.getState().undoDelete()).toBe(true);
    expect(active().chapters.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(codes()).toEqual([
      ["a1", "1.1"],
      ["a2", "1.2"],
      ["b1", "2.1"],
    ]);
  });

  it("a new delete replaces the pending snapshot", () => {
    const s = useBudgetStore.getState();
    s.removeItem("a1");
    s.removeItem("a2");
    expect(useBudgetStore.getState().undoDelete()).toBe(true);
    // Only the latest delete (a2) is restored; a1 stays deleted.
    expect(codes()).toEqual([
      ["a2", "1.1"],
      ["b1", "2.1"],
    ]);
  });

  it("returns false and dismiss clears when nothing is pending", () => {
    expect(useBudgetStore.getState().undoDelete()).toBe(false);
    useBudgetStore.getState().removeItem("a1");
    useBudgetStore.getState().dismissDelete();
    expect(useBudgetStore.getState().lastDeleted).toBeNull();
    expect(useBudgetStore.getState().undoDelete()).toBe(false);
  });

  it("restores into the origin budget and reactivates it", () => {
    const s = useBudgetStore.getState();
    const other = s.newBudget("Other");
    s.setActiveBudget("b-test");
    s.removeItem("a1");
    s.setActiveBudget(other);
    expect(useBudgetStore.getState().undoDelete()).toBe(true);
    const state = useBudgetStore.getState();
    expect(state.activeId).toBe("b-test");
    expect(state.budgets["b-test"].items.map((i) => i.id)).toContain("a1");
  });
});

describe("breakdown", () => {
  it("updateBreakdown auto-creates and merges", () => {
    const { updateBreakdown } = useBudgetStore.getState();
    updateBreakdown("a1", { otherCost: 5 });
    updateBreakdown("a1", { labor: { hours: 2, ratePerHour: 30 } });
    const breakdown = active().items.find((i) => i.id === "a1")?.breakdown;
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
    const materialId = active().items.find((i) => i.id === "a1")?.breakdown
      ?.materials[0].id as string;
    s.updateMaterial("a1", materialId, { description: "Screen", quantity: 2, price: 100 });
    let materials = active().items.find((i) => i.id === "a1")?.breakdown?.materials;
    expect(materials).toHaveLength(1);
    expect(materials?.[0]).toMatchObject({ description: "Screen", quantity: 2, price: 100 });
    s.removeMaterial("a1", materialId);
    materials = active().items.find((i) => i.id === "a1")?.breakdown?.materials;
    expect(materials).toHaveLength(0);
  });
});

describe("budgets", () => {
  it("newBudget creates, numbers and activates", () => {
    const id = useBudgetStore.getState().newBudget("Kitchen");
    const state = useBudgetStore.getState();
    expect(state.activeId).toBe(id);
    expect(state.order[0]).toBe(id);
    expect(state.budgets[id]).toMatchObject({ name: "Kitchen" });
    expect(state.budgets[id].number).toMatch(/^\d{4}-\d{3}$/);
  });

  it("duplicateBudget deep-copies with fresh ids after the original", () => {
    const copyId = useBudgetStore.getState().duplicateBudget("b-test", " (copy)");
    expect(copyId).not.toBeNull();
    const state = useBudgetStore.getState();
    const copy = state.budgets[copyId as string];
    expect(copy.name).toBe(`${fixture().name} (copy)`);
    expect(state.order).toEqual(["b-test", copyId]);
    expect(copy.chapters.map((c) => c.id)).not.toEqual(["c1", "c2"]);
    expect(copy.items.map((i) => i.id)).not.toEqual(["a1", "a2", "b1"]);
    // Chapter links survive the id remap.
    const chapterIds = new Set(copy.chapters.map((c) => c.id));
    expect(copy.items.every((i) => chapterIds.has(i.chapterId))).toBe(true);
    expect(copy.items.map((i) => i.code)).toEqual(["1.1", "1.2", "2.1"]);
  });

  it("removeBudget falls back to a neighbour and drops its undo", () => {
    const s = useBudgetStore.getState();
    const other = s.newBudget("Other");
    s.setActiveBudget("b-test");
    s.removeItem("a1");
    s.removeBudget("b-test");
    const state = useBudgetStore.getState();
    expect(state.budgets["b-test"]).toBeUndefined();
    expect(state.activeId).toBe(other);
    expect(state.lastDeleted).toBeNull();
  });

  it("migrates the legacy single-budget key once", () => {
    localStorage.setItem(
      "presupuestador-budget-v1",
      JSON.stringify({ state: { budget: { ...fixture(), id: "legacy-1" } }, version: 0 }),
    );
    const next = mergePersistedState(undefined, useBudgetStore.getState());
    expect(next.budgets["legacy-1"].name).toBe(fixture().name);
    expect(next.order).toEqual(["legacy-1"]);
    expect(next.activeId).toBe("legacy-1");
    expect(localStorage.getItem("presupuestador-budget-v1")).toBeNull();
  });

  it("keeps stored budgets and backfills new fields", () => {
    const next = mergePersistedState(
      {
        budgets: { "b-test": { ...fixture(), ivaIncluded: undefined as unknown as boolean } },
        order: ["b-test"],
        activeId: "b-test",
      },
      useBudgetStore.getState(),
    );
    expect(next.budgets["b-test"].ivaIncluded).toBe(true);
    expect(next.order).toEqual(["b-test"]);
    expect(next.activeId).toBe("b-test");
  });
});
