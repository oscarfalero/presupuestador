import { create } from "zustand";
import { persist } from "zustand/middleware";
import { renumber } from "./calc";
import { createBudget, type Budget, type BudgetItem, type Chapter } from "./budget-types";

interface BudgetState {
  budget: Budget;
  setMeta: (patch: Partial<Pick<Budget, "name" | "details" | "clientName" | "date" | "ivaPct">>) => void;
  addChapter: (title?: string) => void;
  renameChapter: (id: string, title: string) => void;
  moveChapter: (id: string, direction: -1 | 1) => void;
  addItem: (chapterId: string, patch?: Partial<BudgetItem>) => void;
  updateItem: (id: string, patch: Partial<BudgetItem>) => void;
  moveItem: (id: string, toChapterId: string, toIndex: number) => void;
  removeItem: (id: string) => void;
  reset: () => void;
}

function uid(): string {
  return crypto.randomUUID();
}

function sampleBudget(): Budget {
  const chapter1: Chapter = { id: uid(), order: 0, title: "Masonry" };
  const chapter2: Chapter = { id: uid(), order: 1, title: "Plumbing" };
  return renumber(
    createBudget({
      name: "Bathroom renovation — example",
      details: "Sample budget to validate the editor UX.",
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

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set) => ({
      budget: sampleBudget(),
      setMeta: (patch) => set((s) => ({ budget: { ...s.budget, ...patch } })),
      addChapter: (title = "New chapter") =>
        set((s) => {
          const chapters: Chapter[] = [
            ...s.budget.chapters,
            { id: uid(), order: s.budget.chapters.length, title },
          ];
          return { budget: renumber({ ...s.budget, chapters }) };
        }),
      renameChapter: (id, title) =>
        set((s) => ({
          budget: {
            ...s.budget,
            chapters: s.budget.chapters.map((c) => (c.id === id ? { ...c, title } : c)),
          },
        })),
      moveChapter: (id, direction) =>
        set((s) => {
          const sorted = [...s.budget.chapters].sort((a, b) => a.order - b.order);
          const idx = sorted.findIndex((c) => c.id === id);
          const j = idx + direction;
          if (idx < 0 || j < 0 || j >= sorted.length) return s;
          const next = [...sorted];
          const [moved] = next.splice(idx, 1);
          next.splice(j, 0, moved);
          const chapters = next.map((c, order) => ({ ...c, order }));
          return { budget: renumber({ ...s.budget, chapters }) };
        }),
      addItem: (chapterId, patch) =>
        set((s) => {
          const order = s.budget.items.filter((i) => i.chapterId === chapterId).length;
          const item: BudgetItem = {
            id: uid(),
            chapterId,
            order,
            code: "",
            title: "New item",
            description: "",
            um: "ud",
            quantity: 1,
            price: 0,
            ...patch,
          };
          return { budget: renumber({ ...s.budget, items: [...s.budget.items, item] }) };
        }),
      updateItem: (id, patch) =>
        set((s) => ({
          budget: {
            ...s.budget,
            items: s.budget.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
          },
        })),
      moveItem: (id, toChapterId, toIndex) =>
        set((s) => {
          const item = s.budget.items.find((i) => i.id === id);
          if (!item) return s;
          const without = s.budget.items.filter((i) => i.id !== id);
          // Normalize order within target chapter
          const target = without
            .filter((i) => i.chapterId === toChapterId)
            .sort((a, b) => a.order - b.order);
          const clamped = Math.max(0, Math.min(toIndex, target.length));
          const reordered: BudgetItem[] = [];
          target.forEach((t, idx) => {
            if (idx === clamped) reordered.push({ ...item, chapterId: toChapterId, order: -1 });
            reordered.push(t);
          });
          if (clamped >= target.length) reordered.push({ ...item, chapterId: toChapterId, order: -1 });
          const others = without.filter((i) => i.chapterId !== toChapterId);
          const withOrders = reordered.map((i, order) => ({ ...i, order }));
          const merged = [...others, ...withOrders];
          // Reassign source chapter orders contiguously as well
          const result: BudgetItem[] = [];
          const byChapter = new Map<string, BudgetItem[]>();
          merged.forEach((i) => {
            const arr = byChapter.get(i.chapterId) ?? [];
            arr.push(i);
            byChapter.set(i.chapterId, arr);
          });
          byChapter.forEach((arr) => {
            arr
              .sort((a, b) => a.order - b.order)
              .forEach((i, order) => result.push({ ...i, order }));
          });
          // Keep items of chapters without items untouched (no-op)
          const knownIds = new Set(result.map((i) => i.id));
          without.forEach((i) => {
            if (!knownIds.has(i.id)) result.push(i);
          });
          return { budget: renumber({ ...s.budget, items: result }) };
        }),
      removeItem: (id) =>
        set((s) => ({
          budget: renumber({ ...s.budget, items: s.budget.items.filter((i) => i.id !== id) }),
        })),
      reset: () => set({ budget: sampleBudget() }),
    }),
    { name: "presupuestador-budget-v1" },
  ),
);
