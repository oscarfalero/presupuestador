"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { selectActiveBudget, useBudgetStore } from "@/lib/store";
import { budgetSubtotal, budgetTotalWithIva } from "@/lib/calc";
import { exportBudgetToExcel, slugify } from "@/lib/exportExcel";
import { ChapterBlock } from "./ChapterBlock";
import { CompanyBlock } from "./CompanyBlock";
import { EditorHeader } from "./EditorHeader";
import { MetaFields } from "./MetaFields";
import { IntroSection } from "./IntroSection";
import { SummaryBlock } from "./SummaryBlock";
import { UndoToast } from "./UndoToast";
import { useStrings } from "@/lib/locale";

interface ActiveDrag {
  type: "item" | "chapter";
  id: string;
  label: string;
}

/**
 * Budget editor shell: document sections plus the chapters drag & drop
 * board. Section bodies live in their own components (EditorHeader,
 * MetaFields, IntroSection, SummaryBlock, ChapterBlock).
 */
export function BudgetEditor({ budgetId }: { budgetId: string }) {
  const { addChapter, renameChapter, removeChapter, addItem, updateItem, removeItem, moveItem, moveChapterTo, updateBreakdown, addMaterial, updateMaterial, removeMaterial } = useBudgetStore();
  const setActiveBudget = useBudgetStore((s) => s.setActiveBudget);
  const budget = useBudgetStore((s) => s.budgets[budgetId]);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

  useEffect(() => {
    setActiveBudget(budgetId);
  }, [budgetId, setActiveBudget]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Touch needs a press-and-hold before the drag starts so vertical
    // scrolling still works; the grip handles stay `touch-none`.
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const chapters = [...budget.chapters].sort((a, b) => a.order - b.order);
  const t = useStrings();
  const chaptersTotal = budgetTotalWithIva(
    budgetSubtotal(budget.items),
    budget.ivaPct,
    budget.ivaIncluded,
  );
  const [exporting, setExporting] = useState<null | "excel" | "pdf">(null);

  if (!budget) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-lg font-medium">{t["budgets.notFound"]}</p>
        <Link href="/" className="mt-2 inline-block text-sm text-zinc-500 underline dark:text-zinc-400">
          {t["budgets.backToList"]}
        </Link>
      </div>
    );
  }

  // Both export libraries are loaded on demand so typing never pays
  // their cost; the PDF used to regenerate on every keystroke.
  const handleExportPdf = async () => {
    if (exporting) return;
    setExporting("pdf");
    try {
      const [{ pdf }, { BudgetPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./BudgetPdfDocument"),
      ]);
      const current = selectActiveBudget(useBudgetStore.getState());
      if (!current) return;
      const blob = await pdf(<BudgetPdfDocument budget={current} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(current.number || current.name) || "budget"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = () => {
    if (exporting) return;
    const current = selectActiveBudget(useBudgetStore.getState());
    if (!current) return;
    setExporting("excel");
    void exportBudgetToExcel(current).finally(() => setExporting(null));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type as ActiveDrag["type"] | undefined;
    if (type === "item") {
      const item = budget.items.find((i) => i.id === active.id);
      setActiveDrag({ type, id: String(active.id), label: item ? `${item.code} ${item.title}` : "Item" });
    } else if (type === "chapter") {
      const chapter = chapters.find((c) => c.id === active.id);
      setActiveDrag({
        type,
        id: String(active.id),
        label: chapter ? `${chapter.order + 1}. ${chapter.title}` : "Chapter",
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const type = active.data.current?.type as string | undefined;

    if (type === "chapter") {
      // `over` can be another chapter or an item inside a chapter.
      const targetChapterId =
        typeof over.id === "string" && over.id.startsWith("chapter-drop-")
          ? over.id.replace("chapter-drop-", "")
          : (budget.items.find((i) => i.id === over.id)?.chapterId ?? String(over.id));
      const toIndex = chapters.findIndex((c) => c.id === targetChapterId);
      if (toIndex >= 0) moveChapterTo(String(active.id), toIndex);
      return;
    }

    if (type === "item") {
      const moving = budget.items.find((i) => i.id === active.id);
      if (!moving) return;
      let targetChapterId: string;
      let targetIndex: number;
      if (typeof over.id === "string" && over.id.startsWith("chapter-drop-")) {
        targetChapterId = over.id.replace("chapter-drop-", "");
        targetIndex = budget.items.filter((i) => i.chapterId === targetChapterId).length;
      } else {
        const target = budget.items.find((i) => i.id === over.id);
        if (!target) return;
        targetChapterId = target.chapterId;
        const inTarget = [...budget.items]
          .filter((i) => i.chapterId === targetChapterId)
          .sort((a, b) => a.order - b.order);
        const overFullIndex = inTarget.findIndex((i) => i.id === target.id);
        targetIndex = inTarget
          .filter((i) => i.id !== moving.id)
          .findIndex((i) => i.id === target.id);
        // Dropping over an item while moving down means landing *after* it:
        // the filtered list lost the moving item, so shift by one.
        if (targetChapterId === moving.chapterId) {
          const currentIndex = inTarget.findIndex((i) => i.id === moving.id);
          if (currentIndex >= 0 && currentIndex < overFullIndex) targetIndex += 1;
          if (targetIndex === currentIndex) return;
        }
      }
      moveItem(moving.id, targetChapterId, targetIndex);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 max-md:px-4">
      <Link href="/" className="mb-4 inline-block min-h-[44px] text-sm leading-[44px] text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100">
        ← {t["budgets.title"]}
      </Link>
      <CompanyBlock />
      <EditorHeader
        exporting={exporting}
        onExportExcel={handleExportExcel}
        onExportPdf={() => void handleExportPdf()}
      />
      <MetaFields />
      <IntroSection />

      <h2 className="mt-8 mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {t["section.summary"]}
      </h2>
      <SummaryBlock />

      <h2 className="mt-8 mb-2 flex items-baseline justify-between gap-3 text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        <span>{t["section.chapters"]}</span>
        <span className="pr-2 text-base normal-case tabular-nums text-zinc-900 dark:text-zinc-100">
          {t["meta.total"]} {chaptersTotal.toFixed(2)}€
        </span>
      </h2>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        {chapters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
            <p className="text-lg font-medium">{t["empty.title"]}</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t["empty.body"]}
            </p>
            <button
              type="button"
              onClick={() => addChapter(t["chapter.newTitle"])}
              className="mt-4 cursor-pointer rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {t["empty.cta"]}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <SortableContext items={chapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {chapters.map((ch) => (
                <ChapterBlock
                  key={ch.id}
                  chapter={ch}
                  items={budget.items.filter((i) => i.chapterId === ch.id)}
                  allItems={budget.items}
                  onRename={renameChapter}
                  onAddItem={addItem}
                  onUpdateItem={updateItem}
                  onRemoveItem={removeItem}
                  onRemoveChapter={removeChapter}
                  onUpdateBreakdown={updateBreakdown}
                  onAddMaterial={addMaterial}
                  onUpdateMaterial={updateMaterial}
                  onRemoveMaterial={removeMaterial}
                />
              ))}
            </SortableContext>
          </div>
        )}
        {chapters.length > 0 ? (
          <button
            type="button"
            onClick={() => addChapter(t["chapter.newTitle"])}
            className="mt-6 cursor-pointer rounded-full border border-dashed border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {t["chapter.add"]}
          </button>
        ) : null}
        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <div className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {activeDrag.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <UndoToast />
    </div>
  );
}
