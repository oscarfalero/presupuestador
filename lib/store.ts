import { create, type StoreApi } from "zustand";
import { persist } from "zustand/middleware";
import { renumber } from "./calc";
import { createBudget, emptyBreakdown, type Budget, type BudgetItem, type Chapter, type ItemBreakdown, type MaterialCost } from "./budget-types";

export type DeletedSnapshot =
  | { kind: "item"; budgetId: string; item: BudgetItem; at: number }
  | { kind: "chapter"; budgetId: string; chapter: Chapter; items: BudgetItem[]; at: number };

interface BudgetState {
  /** All budgets keyed by id; `order` drives the list. */
  budgets: Record<string, Budget>;
  order: string[];
  /** Implicit context for every editing action below. Set from the route. */
  activeId: string | null;
  /** Single-level deleted snapshot for timed undo. Never persisted. */
  lastDeleted: DeletedSnapshot | null;
  setMeta: (patch: Partial<Pick<Budget, "name" | "clientName" | "address" | "date" | "ivaPct" | "ivaIncluded" | "number" | "intro" | "terms" | "payment">>) => void;
  addChapter: (title?: string) => string;
  renameChapter: (id: string, title: string) => void;
  moveChapter: (id: string, direction: -1 | 1) => void;
  moveChapterTo: (id: string, toIndex: number) => void;
  removeChapter: (id: string) => void;
  addItem: (chapterId: string, title: string) => string;
  updateItem: (id: string, patch: Partial<BudgetItem>) => void;
  moveItem: (id: string, toChapterId: string, toIndex: number) => void;
  removeItem: (id: string) => void;
  /** Restores the last deleted snapshot into its origin budget. Returns false when there is nothing to undo. */
  undoDelete: () => boolean;
  dismissDelete: () => void;
  updateBreakdown: (itemId: string, patch: Partial<ItemBreakdown>) => void;
  addMaterial: (itemId: string) => void;
  updateMaterial: (itemId: string, materialId: string, patch: Partial<MaterialCost>) => void;
  removeMaterial: (itemId: string, materialId: string) => void;
  /** Creates a blank budget, activates it and returns its id. */
  newBudget: (name: string) => string;
  /** Deep-copies a budget with fresh ids, inserted after the original. Returns the new id (null when missing). */
  duplicateBudget: (id: string, copySuffix: string) => string | null;
  removeBudget: (id: string) => void;
  setActiveBudget: (id: string | null) => void;
  reset: () => void;
}

function uid(): string {
  return crypto.randomUUID();
}

/** Active budget for selectors and one-shot getState reads. */
export function selectActiveBudget(s: BudgetState): Budget | undefined {
  return s.activeId ? s.budgets[s.activeId] : undefined;
}

/** Applies `fn` to the active budget (renumbered). No-op without one. */
function updateActive(
  set: StoreApi<BudgetState>["setState"],
  get: StoreApi<BudgetState>["getState"],
  fn: (b: Budget) => Budget,
): boolean {
  const s = get();
  const id = s.activeId;
  const current = id ? s.budgets[id] : undefined;
  if (!id || !current) return false;
  set({ budgets: { ...s.budgets, [id]: renumber(fn(current)) } });
  return true;
}

/** Next yearly reference (2026-001…) from existing numbers. */
export function suggestBudgetNumber(budgets: Record<string, Budget>): string {
  const year = new Date().getFullYear();
  let max = 0;
  for (const b of Object.values(budgets)) {
    const m = new RegExp(`^${year}-(\\d+)$`).exec((b.number ?? "").trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${year}-${String(max + 1).padStart(3, "0")}`;
}

function sampleBudget(): Budget {
  const chapter1: Chapter = { id: uid(), order: 0, title: "Masonry" };
  const chapter2: Chapter = { id: uid(), order: 1, title: "Plumbing" };
  return renumber(
    createBudget({
      name: "Bathroom renovation — example",
      number: `${new Date().getFullYear()}-001`,
      chapters: [chapter1, chapter2],
      items: [
        {
          id: uid(),
          chapterId: chapter1.id,
          order: 0,
          code: "",
          title: "Install shower screen",
          description: "Remove old screen, install new glass screen and seal.",
          um: "ud",
          quantity: 1,
          price: 450,
          breakdown: {
            materials: [
              {
                id: uid(),
                description: "Glass shower screen 120cm",
                quantity: 1,
                price: 289,
                sourceLabel: "Preferred supplier",
                sourceUrl: "https://example.com/mampara-120",
              },
            ],
            labor: { hours: 4, ratePerHour: 35 },
            otherCost: 21,
            notes: "289 + 4h x 35 = 140 + sealing 21 => 450",
          },
        },
        {
          id: uid(),
          chapterId: chapter2.id,
          order: 0,
          code: "",
          title: "Replace faucet",
          description: "",
          um: "ud",
          quantity: 1,
          price: 120,
        },
      ],
    }),
  );
}

function sampleState(): Pick<BudgetState, "budgets" | "order" | "activeId"> {
  const sample = sampleBudget();
  return { budgets: { [sample.id]: sample }, order: [sample.id], activeId: sample.id };
}

const LEGACY_KEY = "presupuestador-budget-v1";

function backfill(b: Budget): Budget {
  const defined = Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined));
  return { ...createBudget(), ...defined, id: b.id ?? uid() };
}

type PersistedShape = Pick<BudgetState, "budgets" | "order" | "activeId">;

export const useBudgetStore = create<BudgetState>()(
  persist<BudgetState, [], [], PersistedShape>(
    (set, get) => ({
      ...sampleState(),
      lastDeleted: null,
      setMeta: (patch) => {
        updateActive(set, get, (b) => ({ ...b, ...patch }));
      },
      addChapter: (title) => {
        const id = uid();
        const ok = updateActive(set, get, (b) => ({
          ...b,
          chapters: [...b.chapters, { id, order: b.chapters.length, title: title || "New chapter" }],
        }));
        return ok ? id : "";
      },
      renameChapter: (id, title) => {
        updateActive(set, get, (b) => ({
          ...b,
          chapters: b.chapters.map((c) => (c.id === id ? { ...c, title } : c)),
        }));
      },
      moveChapter: (id, direction) => {
        updateActive(set, get, (b) => {
          const sorted = [...b.chapters].sort((a, b2) => a.order - b2.order);
          const idx = sorted.findIndex((c) => c.id === id);
          const j = idx + direction;
          if (idx < 0 || j < 0 || j >= sorted.length) return b;
          const next = [...sorted];
          const [moved] = next.splice(idx, 1);
          next.splice(j, 0, moved);
          return { ...b, chapters: next.map((c, order) => ({ ...c, order })) };
        });
      },
      moveChapterTo: (id, toIndex) => {
        updateActive(set, get, (b) => {
          const sorted = [...b.chapters].sort((a, b2) => a.order - b2.order);
          const from = sorted.findIndex((c) => c.id === id);
          if (from < 0) return b;
          const clamped = Math.max(0, Math.min(toIndex, sorted.length - 1));
          if (clamped === from) return b;
          const next = [...sorted];
          const [moved] = next.splice(from, 1);
          next.splice(clamped, 0, moved);
          return { ...b, chapters: next.map((c, order) => ({ ...c, order })) };
        });
      },
      removeChapter: (id) => {
        const s = get();
        const budgetId = s.activeId;
        const budget = budgetId ? s.budgets[budgetId] : undefined;
        if (!budget) return;
        const chapter = budget.chapters.find((c) => c.id === id);
        if (!chapter) return;
        set({
          budgets: {
            ...s.budgets,
            [budgetId as string]: renumber({
              ...budget,
              chapters: budget.chapters.filter((c) => c.id !== id),
              items: budget.items.filter((i) => i.chapterId !== id),
            }),
          },
          lastDeleted: {
            kind: "chapter",
            budgetId: budgetId as string,
            chapter,
            items: budget.items.filter((i) => i.chapterId === id),
            at: Date.now(),
          },
        });
      },
      undoDelete: () => {
        const { lastDeleted: snap } = get();
        if (!snap) return false;
        const s = get();
        const budget = s.budgets[snap.budgetId];
        if (!budget) return false;
        const apply = (next: Budget) =>
          set({
            budgets: { ...get().budgets, [snap.budgetId]: renumber(next) },
            activeId: snap.budgetId,
            lastDeleted: null,
          });
        if (snap.kind === "item") {
          if (!budget.chapters.some((c) => c.id === snap.item.chapterId)) return false;
          const siblings = budget.items
            .filter((i) => i.chapterId === snap.item.chapterId)
            .sort((a, b) => a.order - b.order);
          const idx = Math.max(0, Math.min(snap.item.order, siblings.length));
          const reordered = [...siblings];
          reordered.splice(idx, 0, snap.item);
          const restoredIds = new Set(reordered.map((i) => i.id));
          apply({
            ...budget,
            items: [
              ...budget.items.filter((i) => !restoredIds.has(i.id)),
              ...reordered.map((i, order) => ({ ...i, order })),
            ],
          });
          return true;
        }
        const chapters = [...budget.chapters].sort((a, b) => a.order - b.order);
        const idx = Math.max(0, Math.min(snap.chapter.order, chapters.length));
        const next = [...chapters];
        next.splice(idx, 0, snap.chapter);
        apply({
          ...budget,
          chapters: next.map((c, order) => ({ ...c, order })),
          items: [...budget.items, ...snap.items],
        });
        return true;
      },
      dismissDelete: () => set({ lastDeleted: null }),
      addItem: (chapterId, title) => {
        const id = uid();
        const ok = updateActive(set, get, (b) => {
          const item: BudgetItem = {
            id,
            chapterId,
            order: b.items.filter((i) => i.chapterId === chapterId).length,
            code: "",
            title: title || "New item",
            description: "",
            um: "ud",
            quantity: 1,
            price: 0,
          };
          return { ...b, items: [...b.items, item] };
        });
        return ok ? id : "";
      },
      updateItem: (id, patch) => {
        updateActive(set, get, (b) => ({
          ...b,
          items: b.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        }));
      },
      moveItem: (id, toChapterId, toIndex) => {
        updateActive(set, get, (b) => {
          const moving = b.items.find((i) => i.id === id);
          if (!moving) return b;
          const rest = b.items.filter((i) => i.id !== id);
          const target = rest
            .filter((i) => i.chapterId === toChapterId)
            .sort((a, c) => a.order - c.order);
          const clamped = Math.max(0, Math.min(toIndex, target.length));
          const inserted = [...target];
          inserted.splice(clamped, 0, { ...moving, chapterId: toChapterId });
          const insertedIds = new Set(inserted.map((i) => i.id));
          return {
            ...b,
            items: [
              ...rest.filter((i) => !insertedIds.has(i.id)),
              ...inserted.map((i, order) => ({ ...i, order })),
            ],
          };
        });
      },
      removeItem: (id) => {
        const s = get();
        const budgetId = s.activeId;
        const budget = budgetId ? s.budgets[budgetId] : undefined;
        if (!budget) return;
        const item = budget.items.find((i) => i.id === id);
        if (!item) return;
        set({
          budgets: {
            ...s.budgets,
            [budgetId as string]: renumber({
              ...budget,
              items: budget.items.filter((i) => i.id !== id),
            }),
          },
          lastDeleted: { kind: "item", budgetId: budgetId as string, item, at: Date.now() },
        });
      },
      updateBreakdown: (itemId, patch) => {
        updateActive(set, get, (b) => ({
          ...b,
          items: b.items.map((i) =>
            i.id === itemId
              ? { ...i, breakdown: { ...emptyBreakdown(), ...i.breakdown, ...patch } }
              : i,
          ),
        }));
      },
      addMaterial: (itemId) => {
        updateActive(set, get, (b) => ({
          ...b,
          items: b.items.map((i) => {
            if (i.id !== itemId) return i;
            const breakdown = { ...emptyBreakdown(), ...i.breakdown };
            const material: MaterialCost = {
              id: uid(),
              description: "",
              quantity: 1,
              price: 0,
            };
            return { ...i, breakdown: { ...breakdown, materials: [...breakdown.materials, material] } };
          }),
        }));
      },
      updateMaterial: (itemId, materialId, patch) => {
        updateActive(set, get, (b) => ({
          ...b,
          items: b.items.map((i) => {
            if (i.id !== itemId || !i.breakdown) return i;
            return {
              ...i,
              breakdown: {
                ...i.breakdown,
                materials: i.breakdown.materials.map((m) =>
                  m.id === materialId ? { ...m, ...patch } : m,
                ),
              },
            };
          }),
        }));
      },
      removeMaterial: (itemId, materialId) => {
        updateActive(set, get, (b) => ({
          ...b,
          items: b.items.map((i) => {
            if (i.id !== itemId || !i.breakdown) return i;
            return {
              ...i,
              breakdown: {
                ...i.breakdown,
                materials: i.breakdown.materials.filter((m) => m.id !== materialId),
              },
            };
          }),
        }));
      },
      newBudget: (name) => {
        const s = get();
        const budget = createBudget({ name, number: suggestBudgetNumber(s.budgets) });
        set({
          budgets: { ...s.budgets, [budget.id]: budget },
          order: [budget.id, ...s.order],
          activeId: budget.id,
          lastDeleted: null,
        });
        return budget.id;
      },
      duplicateBudget: (id, copySuffix) => {
        const s = get();
        const source = s.budgets[id];
        if (!source) return null;
        const chapterIds = new Map(source.chapters.map((c) => [c.id, uid()]));
        const copy: Budget = {
          ...source,
          id: uid(),
          name: `${source.name}${copySuffix}`,
          number: suggestBudgetNumber(s.budgets),
          chapters: source.chapters.map((c) => ({ ...c, id: chapterIds.get(c.id) as string })),
          items: source.items.map((i) => ({
            ...i,
            id: uid(),
            chapterId: chapterIds.get(i.chapterId) ?? i.chapterId,
            breakdown: i.breakdown
              ? {
                  ...i.breakdown,
                  materials: i.breakdown.materials.map((m) => ({ ...m, id: uid() })),
                }
              : undefined,
          })),
        };
        const at = s.order.indexOf(id);
        const order = [...s.order];
        order.splice(at < 0 ? s.order.length : at + 1, 0, copy.id);
        set({ budgets: { ...s.budgets, [copy.id]: copy }, order, lastDeleted: null });
        return copy.id;
      },
      removeBudget: (id) => {
        const s = get();
        if (!s.budgets[id]) return;
        const budgets = { ...s.budgets };
        delete budgets[id];
        const order = s.order.filter((b) => b !== id);
        let activeId = s.activeId;
        if (activeId === id) {
          const idx = s.order.indexOf(id);
          activeId = order[Math.min(idx, order.length - 1)] ?? null;
        }
        set({
          budgets,
          order,
          activeId,
          lastDeleted: s.lastDeleted?.budgetId === id ? null : s.lastDeleted,
        });
      },
      setActiveBudget: (id) => set({ activeId: id }),
      reset: () => set({ ...sampleState(), lastDeleted: null }),
    }),
    {
      name: "presupuestador-budgets-v1",
      partialize: (s): PersistedShape => ({ budgets: s.budgets, order: s.order, activeId: s.activeId }),
      merge: mergePersistedState,
    },
  ),
);

/**
 * Rehydration merge (exported pure for tests: zustand's persist API is
 * inert in Node because there is no `window.localStorage` there).
 */
export function mergePersistedState(
  persisted: unknown,
  current: BudgetState,
): BudgetState {
  const p = persisted as Partial<BudgetState> | undefined;
  // Budgets already stored (possibly an explicitly emptied list).
  if (p?.budgets) {
    const budgets: Record<string, Budget> = {};
    for (const [id, b] of Object.entries(p.budgets)) budgets[id] = backfill(b);
    const order = (p.order ?? Object.keys(budgets)).filter((id) => budgets[id]);
    for (const id of Object.keys(budgets)) if (!order.includes(id)) order.push(id);
    const activeId = p.activeId && budgets[p.activeId] ? p.activeId : (order[0] ?? null);
    return { ...current, budgets, order, activeId };
  }
  // One-time migration from the single-budget key (removed afterwards
  // so an emptied list never resurrects the legacy budget).
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      const parsed = raw ? (JSON.parse(raw) as { state?: { budget?: Budget & { details?: string } }; budget?: Budget & { details?: string } }) : undefined;
      const saved = parsed?.state?.budget ?? parsed?.budget;
      if (saved) {
        const { details, ...rest } = saved;
        const budget = backfill(rest as Budget);
        if (!budget.intro?.trim() && details?.trim()) budget.intro = details.trim();
        localStorage.removeItem(LEGACY_KEY);
        return { ...current, budgets: { [budget.id]: budget }, order: [budget.id], activeId: budget.id };
      }
    } catch {
      // Corrupt legacy snapshot: fall through to the sample.
    }
  }
  return current;
}
