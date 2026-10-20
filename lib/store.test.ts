import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mergePersistedState, selectActiveBudget, sortBudgetIds, useBudgetStore } from "./store";
import { emptyCompany, useCompanyStore } from "./company";
import { renumber } from "./calc";
import { createBudget, uid, type Budget, type BudgetItem } from "./budget-types";

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
  useCompanyStore.setState({ profile: emptyCompany() });
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

  it("newBudget inherits company terms/payment defaults", () => {
    useCompanyStore.setState({
      profile: { ...emptyCompany(), terms: "Net 30", payment: "Transfer" },
    });
    const id = useBudgetStore.getState().newBudget("Inherited");
    expect(useBudgetStore.getState().budgets[id]).toMatchObject({
      terms: "Net 30",
      payment: "Transfer",
    });
  });

  it("newBudget leaves terms/payment blank without company defaults", () => {
    const id = useBudgetStore.getState().newBudget("Blank");
    expect(useBudgetStore.getState().budgets[id]).toMatchObject({ terms: "", payment: "" });
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

describe("updatedAt stamps (issue #56)", () => {
  const stamp = () => active().updatedAt;

  it("starts unknown for budgets without the field", () => {
    expect(stamp()).toBeUndefined();
  });

  it("stamps meta, chapter and item mutations", () => {
    const s = useBudgetStore.getState();
    s.setMeta({ clientName: "Juanma" });
    expect(stamp()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    s.addChapter("Extra");
    expect(stamp()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    s.updateItem("a1", { price: 99 });
    expect(stamp()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("does not stamp no-op moves", () => {
    // c1 is already first: moving it up changes nothing.
    useBudgetStore.getState().moveChapter("c1", -1);
    expect(stamp()).toBeUndefined();
  });

  it("does not stamp same-value writes", () => {
    // Writing back the current value is not an edit: no stamp, and —
    // via docsEqual — no phantom cloud push either.
    useBudgetStore.getState().setMeta({ clientName: active().clientName });
    expect(stamp()).toBeUndefined();
    useBudgetStore.getState().renameChapter("c1", "One");
    expect(stamp()).toBeUndefined();
  });

  it("stamps chapter/item deletes and their undo", () => {
    const s = useBudgetStore.getState();
    s.removeItem("a1");
    expect(stamp()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(s.undoDelete()).toBe(true);
    expect(stamp()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    useBudgetStore.getState().removeChapter("c2");
    expect(stamp()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(active().chapters.some((c) => c.id === "c2")).toBe(false);
  });

  it("stamps new and duplicated budgets at creation", () => {
    const s = useBudgetStore.getState();
    const id = s.newBudget("Nuevo");
    expect(useBudgetStore.getState().budgets[id].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const copyId = s.duplicateBudget("b-test", " (copia)");
    expect(copyId).not.toBeNull();
    if (copyId) expect(useBudgetStore.getState().budgets[copyId].updatedAt).toBeDefined();
  });

  it("backfill never invents a timestamp for legacy docs", () => {
    const next = mergePersistedState(
      { budgets: { "b-test": fixture() }, order: ["b-test"], activeId: "b-test" },
      useBudgetStore.getState(),
    );
    expect(next.budgets["b-test"].updatedAt).toBeUndefined();
  });

  it("backfill preserves a carried timestamp", () => {
    const stamped = { ...fixture(), updatedAt: "2026-01-01T00:00:00.000Z" };
    const next = mergePersistedState(
      { budgets: { "b-test": stamped }, order: ["b-test"], activeId: "b-test" },
      useBudgetStore.getState(),
    );
    expect(next.budgets["b-test"].updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("uid falls back to getRandomValues in non-secure HTTP contexts", () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      const id = uid();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});

describe("budgets list order (issue #62)", () => {
  // The shared fixture is unrelated here (and its real-clock stamp would
  // outrank the fake timers below): start from an empty list.
  beforeEach(() => {
    useBudgetStore.setState({ budgets: {}, order: [], activeId: null, lastDeleted: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const displayed = () => {
    const s = useBudgetStore.getState();
    return sortBudgetIds(s.order, s.budgets);
  };

  it("sorts by createdAt, ignoring the stored order array", () => {
    const budgets: Record<string, Budget> = {
      a: { ...fixture(), id: "a", number: "2026-001", createdAt: "2026-01-01T00:00:00.000Z" },
      b: { ...fixture(), id: "b", number: "2026-002", createdAt: "2026-02-01T00:00:00.000Z" },
      c: { ...fixture(), id: "c", number: "", createdAt: "2026-03-01T00:00:00.000Z" },
    };
    expect(sortBudgetIds(["a", "b", "c"], budgets)).toEqual(["c", "b", "a"]);
    expect(sortBudgetIds(["c", "a", "b"], budgets)).toEqual(["c", "b", "a"]);
  });

  it("breaks timestamp ties deterministically by number, then id", () => {
    const at = "2026-01-01T00:00:00.000Z";
    const budgets: Record<string, Budget> = {
      a: { ...fixture(), id: "a", number: "2026-001", createdAt: at },
      b: { ...fixture(), id: "b", number: "2026-002", createdAt: at },
      c: { ...fixture(), id: "c", number: "", createdAt: at },
      d: { ...fixture(), id: "d", number: "", createdAt: at },
      e: { ...fixture(), id: "e", number: "2026-9", createdAt: at },
      f: { ...fixture(), id: "f", number: "2026-10", createdAt: at },
    };
    expect(sortBudgetIds(["a", "b", "c", "d"], budgets)).toEqual(["b", "a", "c", "d"]);
    expect(sortBudgetIds(["d", "c", "b", "a"], budgets)).toEqual(["b", "a", "c", "d"]);
    // Numeric-aware without locale/ICU collation: 10 sorts above 9.
    expect(sortBudgetIds(["e", "f"], budgets)).toEqual(["f", "e"]);
  });

  it("ignores ids missing from the budgets map", () => {
    const budgets: Record<string, Budget> = {
      a: { ...fixture(), id: "a", createdAt: "2026-01-01T00:00:00.000Z" },
    };
    expect(sortBudgetIds(["ghost", "a"], budgets)).toEqual(["a", "ghost"]);
    expect(sortBudgetIds(["a", "ghost"], budgets)).toEqual(["a", "ghost"]);
  });

  it("puts a new budget on top and a duplicate above the original", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T10:00:00.000Z"));
    const original = useBudgetStore.getState().newBudget("Original");
    expect(useBudgetStore.getState().budgets[original].createdAt).toBe("2026-05-01T10:00:00.000Z");
    vi.setSystemTime(new Date("2026-05-02T10:00:00.000Z"));
    const second = useBudgetStore.getState().newBudget("Second");
    expect(displayed().slice(0, 2)).toEqual([second, original]);

    // The copy is a new document: it carries its own creation stamp and
    // lands above the source, wherever that one sits.
    vi.setSystemTime(new Date("2026-05-03T10:00:00.000Z"));
    const copy = useBudgetStore.getState().duplicateBudget(original, " (copia)");
    expect(copy).not.toBeNull();
    expect(useBudgetStore.getState().budgets[copy as string].createdAt).toBe(
      "2026-05-03T10:00:00.000Z",
    );
    expect(displayed()[0]).toBe(copy);
  });

  it("editing an old budget updates updatedAt but never moves it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    const older = useBudgetStore.getState().newBudget("Older");
    vi.setSystemTime(new Date("2026-06-02T10:00:00.000Z"));
    const newer = useBudgetStore.getState().newBudget("Newer");
    vi.setSystemTime(new Date("2026-06-03T10:00:00.000Z"));
    useBudgetStore.getState().setActiveBudget(older);
    useBudgetStore.getState().setMeta({ clientName: "Edited" });
    expect(useBudgetStore.getState().budgets[older]).toMatchObject({
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-03T10:00:00.000Z",
    });
    expect(displayed().slice(0, 2)).toEqual([newer, older]);
  });

  it("backfills legacy budgets from the stored order and preserves it", () => {
    const legacy = (id: string) => ({ ...fixture(), id, createdAt: undefined });
    const next = mergePersistedState(
      { budgets: { a: legacy("a"), b: legacy("b"), c: legacy("c") }, order: ["c", "b", "a"], activeId: "c" },
      useBudgetStore.getState(),
    );
    // First stored entry is the newest: strictly decreasing stamps.
    expect(next.budgets.c.createdAt! > next.budgets.b.createdAt!).toBe(true);
    expect(next.budgets.b.createdAt! > next.budgets.a.createdAt!).toBe(true);
    expect(sortBudgetIds(["a", "b", "c"], next.budgets)).toEqual(["c", "b", "a"]);
    // Anything created after the upgrade outranks the backfilled dates.
    const fresh = { ...createBudget(), id: "fresh" };
    expect(sortBudgetIds(["fresh", "a", "b", "c"], { ...next.budgets, fresh })[0]).toBe("fresh");
  });

  it("keeps backfilled dates idempotent and never overwrites real ones", () => {
    const legacy = (id: string) => ({ ...fixture(), id, createdAt: undefined });
    const persisted = { budgets: { a: legacy("a"), b: legacy("b") }, order: ["b", "a"], activeId: "b" };
    const once = mergePersistedState(persisted, useBudgetStore.getState());
    const twice = mergePersistedState(once, useBudgetStore.getState());
    expect(twice.budgets).toEqual(once.budgets);

    const kept = "2025-05-05T00:00:00.000Z";
    const withStamp = mergePersistedState(
      { budgets: { a: { ...legacy("a"), createdAt: kept } }, order: ["a"], activeId: "a" },
      useBudgetStore.getState(),
    );
    expect(withStamp.budgets.a.createdAt).toBe(kept);
  });

  it("stamps unknown dates above the newest real one in mixed docs", () => {
    // A stale pre-#62 tab can push a budget into an otherwise stamped doc:
    // it is new, so it must not be buried at the 2000 sentinel.
    const real = "2026-07-01T00:00:00.000Z";
    const next = mergePersistedState(
      {
        budgets: {
          old: { ...fixture(), id: "old", createdAt: undefined },
          fresh: { ...fixture(), id: "fresh", createdAt: real },
        },
        order: ["old", "fresh"],
        activeId: "fresh",
      },
      useBudgetStore.getState(),
    );
    expect(next.budgets.old.createdAt! > real).toBe(true);
    expect(sortBudgetIds(["fresh", "old"], next.budgets)).toEqual(["old", "fresh"]);
  });

  it("uses the legacy sentinel for the one-time single-budget migration", () => {
    localStorage.setItem(
      "presupuestador-budget-v1",
      JSON.stringify({
        state: { budget: { ...fixture(), id: "legacy-1", createdAt: undefined } },
        version: 0,
      }),
    );
    const next = mergePersistedState(undefined, useBudgetStore.getState());
    expect(next.budgets["legacy-1"].createdAt).toBe("2000-01-01T00:00:00.001Z");
  });

  it("repairs unusable creation stamps instead of throwing", () => {
    const next = mergePersistedState(
      {
        budgets: {
          bad: { ...fixture(), id: "bad", createdAt: "not-a-date" },
          dateOnly: { ...fixture(), id: "dateOnly", createdAt: "2026-01-01" },
          outOfRange: { ...fixture(), id: "outOfRange", createdAt: "2026-13-45T99:99:99.000Z" },
          stamp: { ...fixture(), id: "stamp", createdAt: "2026-02-02T00:00:00.000Z" },
        },
        order: ["bad", "dateOnly", "outOfRange", "stamp"],
        activeId: "stamp",
      },
      useBudgetStore.getState(),
    );
    // Canonical stamps survive untouched; anything else is re-derived.
    expect(next.budgets.stamp.createdAt).toBe("2026-02-02T00:00:00.000Z");
    for (const id of ["bad", "dateOnly", "outOfRange"]) {
      expect(next.budgets[id].createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(next.budgets[id].createdAt! > next.budgets.stamp.createdAt!).toBe(true);
      expect(Number.isNaN(Date.parse(next.budgets[id].createdAt!))).toBe(false);
    }
  });

  it("deduplicates the persisted order array", () => {
    const next = mergePersistedState(
      {
        budgets: { a: { ...fixture(), id: "a", createdAt: undefined } },
        order: ["a", "a"],
        activeId: "a",
      },
      useBudgetStore.getState(),
    );
    expect(next.order).toEqual(["a"]);
  });

  it("falls back to the display neighbour when the active budget is deleted", () => {
    const stamped = (id: string, name: string, createdAt: string) => ({ ...fixture(), id, name, createdAt });
    useBudgetStore.setState({
      budgets: {
        g: stamped("g", "Gamma", "2026-03-01T00:00:00.000Z"),
        b: stamped("b", "Beta", "2026-02-01T00:00:00.000Z"),
        a: stamped("a", "Alpha", "2026-01-01T00:00:00.000Z"),
      },
      order: ["a", "b", "g"],
      activeId: "b",
      lastDeleted: null,
    });
    useBudgetStore.getState().removeBudget("b");
    // Display order is g, b, a: the row below the deleted one is a.
    expect(useBudgetStore.getState().activeId).toBe("a");
  });

  it("clears the active budget when the last one is deleted", () => {
    useBudgetStore.setState({
      budgets: { a: { ...fixture(), id: "a", createdAt: "2026-01-01T00:00:00.000Z" } },
      order: ["a"],
      activeId: "a",
      lastDeleted: null,
    });
    useBudgetStore.getState().removeBudget("a");
    expect(useBudgetStore.getState().activeId).toBeNull();
  });
});
