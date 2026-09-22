import { create } from "zustand";
import { persist } from "zustand/middleware";
import { renumber } from "./calc";
import { createBudget, emptyBreakdown, type Budget, type BudgetItem, type Chapter, type ItemBreakdown, type MaterialCost } from "./budget-types";

interface BudgetState {
  budget: Budget;
  setMeta: (patch: Partial<Pick<Budget, "name" | "details" | "clientName" | "date" | "ivaPct">>) => void;
  addChapter: (title?: string) => string;
  renameChapter: (id: string, title: string) => void;
  moveChapter: (id: string, direction: -1 | 1) => void;
  moveChapterTo: (id: string, toIndex: number) => void;
  removeChapter: (id: string) => void;
  addItem: (chapterId: string, patch?: Partial<BudgetItem>) => string;
  updateItem: (id: string, patch: Partial<BudgetItem>) => void;
  moveItem: (id: string, toChapterId: string, toIndex: number) => void;
  removeItem: (id: string) => void;
  updateBreakdown: (itemId: string, patch: Partial<ItemBreakdown>) => void;
  addMaterial: (itemId: string) => void;
  updateMaterial: (itemId: string, materialId: string, patch: Partial<MaterialCost>) => void;
  removeMaterial: (itemId: string, materialId: string) => void;
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
      addChapter: (title = "New chapter") => {
        const id = uid();
        set((s) => {
          const chapters: Chapter[] = [...s.budget.chapters, { id, order: s.budget.chapters.length, title }];
          return { budget: renumber({ ...s.budget, chapters }) };
        });
        return id;
      },
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
      moveChapterTo: (id, toIndex) =>
        set((s) => {
          const sorted = [...s.budget.chapters].sort((a, b) => a.order - b.order);
          const from = sorted.findIndex((c) => c.id === id);
          if (from < 0) return s;
          const clamped = Math.max(0, Math.min(toIndex, sorted.length - 1));
          if (clamped === from) return s;
          const next = [...sorted];
          const [moved] = next.splice(from, 1);
          next.splice(clamped, 0, moved);
          const chapters = next.map((c, order) => ({ ...c, order }));
          return { budget: renumber({ ...s.budget, chapters }) };
        }),
      removeChapter: (id) =>
        set((s) => ({
          budget: renumber({
            ...s.budget,
            chapters: s.budget.chapters.filter((c) => c.id !== id),
            items: s.budget.items.filter((i) => i.chapterId !== id),
          }),
        })),
      addItem: (chapterId, patch) => {
        const id = uid();
        set((s) => {
          const order = s.budget.items.filter((i) => i.chapterId === chapterId).length;
          const item: BudgetItem = {
            id,
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
        });
        return id;
      },
      updateItem: (id, patch) =>
        set((s) => ({
          budget: {
            ...s.budget,
            items: s.budget.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
          },
        })),
      moveItem: (id, toChapterId, toIndex) =>
        set((s) => {
          const moving = s.budget.items.find((i) => i.id === id);
          if (!moving) return s;
          const rest = s.budget.items.filter((i) => i.id !== id);
          const target = rest
            .filter((i) => i.chapterId === toChapterId)
            .sort((a, b) => a.order - b.order);
          const clamped = Math.max(0, Math.min(toIndex, target.length));
          const inserted = [...target];
          inserted.splice(clamped, 0, { ...moving, chapterId: toChapterId });
          const insertedIds = new Set(inserted.map((i) => i.id));
          const items = [
            ...rest.filter((i) => !insertedIds.has(i.id)),
            ...inserted.map((i, order) => ({ ...i, order })),
          ];
          return { budget: renumber({ ...s.budget, items }) };
        }),
      removeItem: (id) =>
        set((s) => ({
          budget: renumber({ ...s.budget, items: s.budget.items.filter((i) => i.id !== id) }),
        })),
      updateBreakdown: (itemId, patch) =>
        set((s) => ({
          budget: {
            ...s.budget,
            items: s.budget.items.map((i) =>
              i.id === itemId
                ? { ...i, breakdown: { ...emptyBreakdown(), ...i.breakdown, ...patch } }
                : i,
            ),
          },
        })),
      addMaterial: (itemId) =>
        set((s) => ({
          budget: {
            ...s.budget,
            items: s.budget.items.map((i) => {
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
          },
        })),
      updateMaterial: (itemId, materialId, patch) =>
        set((s) => ({
          budget: {
            ...s.budget,
            items: s.budget.items.map((i) => {
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
          },
        })),
      removeMaterial: (itemId, materialId) =>
        set((s) => ({
          budget: {
            ...s.budget,
            items: s.budget.items.map((i) => {
              if (i.id !== itemId || !i.breakdown) return i;
              return {
                ...i,
                breakdown: {
                  ...i.breakdown,
                  materials: i.breakdown.materials.filter((m) => m.id !== materialId),
                },
              };
            }),
          },
        })),
      reset: () => set({ budget: sampleBudget() }),
    }),
    { name: "presupuestador-budget-v1" },
  ),
);
