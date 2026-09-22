"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useBudgetStore } from "@/lib/store";
import { budgetSubtotal, budgetTotalWithIva, isUnpriced } from "@/lib/calc";
import { IVA_PRESETS } from "@/lib/budget-types";
import { exportBudgetToExcel, slugify } from "@/lib/exportExcel";
import { InlineText } from "./inline-fields";
import { ChapterBlock } from "./ChapterBlock";
import { CompanyBlock } from "./CompanyBlock";
import { DocSections } from "./DocSections";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleToggle } from "@/components/LocaleToggle";
import { UndoToast } from "./UndoToast";
import { useStrings } from "@/lib/locale";

interface ActiveDrag {
  type: "item" | "chapter";
  id: string;
  label: string;
}

/**
 * Budget editor (issues #1-#4): inline editing, drag & drop,
 * internal breakdown panel, and full chapter/item CRUD.
 * Unit-test suite (#5) comes next.
 */
export function BudgetEditor() {
  const { budget, setMeta, addChapter, renameChapter, removeChapter, addItem, updateItem, removeItem, moveItem, moveChapterTo, updateBreakdown, addMaterial, updateMaterial, removeMaterial } = useBudgetStore();
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const chapters = [...budget.chapters].sort((a, b) => a.order - b.order);
  const t = useStrings();
  const subtotal = budgetSubtotal(budget.items);
  const total = budgetTotalWithIva(subtotal, budget.ivaPct);
  const unpricedCount = budget.items.filter(isUnpriced).length;
  const [exporting, setExporting] = useState<null | "excel" | "pdf">(null);

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
      const current = useBudgetStore.getState().budget;
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

  const scrollToFirstUnpriced = () => {
    const first = budget.items.find(isUnpriced);
    if (first)
      document.getElementById(`item-row-${first.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <CompanyBlock />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <InlineText
            value={budget.name}
            onCommit={(name) => setMeta({ name })}
            ariaLabel={t["budget.name"]}
            required
            navId="meta:name"
            className="text-3xl font-semibold tracking-tight"
          />
          <InlineText
            value={budget.details}
            onCommit={(details) => setMeta({ details })}
            ariaLabel={t["budget.details"]}
            placeholder={t["budget.detailsPlaceholder"]}
            navId="meta:details"
            className="mt-1 text-sm text-zinc-500 dark:text-zinc-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <LocaleToggle />
          <ThemeToggle />
          <button
            className="cursor-pointer rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            disabled={exporting !== null}
            onClick={() => {
              if (exporting) return;
              setExporting("excel");
              void exportBudgetToExcel(budget).finally(() => setExporting(null));
            }}
          >
            {exporting === "excel" ? t["header.preparing"] : t["header.exportExcel"]}
          </button>
          <button
            className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
            disabled={exporting !== null}
            onClick={() => void handleExportPdf()}
          >
            {exporting === "pdf" ? t["header.preparingPdf"] : t["header.exportPdf"]}
          </button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          {t["meta.number"]}
          <input
            className="w-28 rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            value={budget.number}
            onChange={(e) => setMeta({ number: e.target.value })}
            aria-label={t["meta.number"]}
            data-nav-id="meta:number"
          />
        </label>
        <label className="flex items-center gap-2">
          {t["meta.date"]}
          <input
            type="date"
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            value={budget.date}
            onChange={(e) => setMeta({ date: e.target.value })}
            aria-label={t["meta.date"]}
            data-nav-id="meta:date"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          {t["meta.client"]}
          <input
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            value={budget.clientName}
            onChange={(e) => setMeta({ clientName: e.target.value })}
            placeholder={t["meta.clientPlaceholder"]}
            aria-label={t["meta.client"]}
            data-nav-id="meta:client"
          />
        </label>
        <label className="flex min-w-52 flex-1 items-center gap-2">
          {t["meta.address"]}
          <input
            className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            value={budget.address}
            onChange={(e) => setMeta({ address: e.target.value })}
            placeholder={t["meta.address"]}
            aria-label={t["meta.address"]}
            data-nav-id="meta:address"
          />
        </label>
        <label className="flex items-center gap-2">
          {t["meta.vat"]}
          <select
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 dark:[&>option]:bg-zinc-900"
            value={budget.ivaPct}
            onChange={(e) => setMeta({ ivaPct: Number(e.target.value) })}
            aria-label={t["meta.vat"]}
            data-nav-id="meta:vat"
          >
            {IVA_PRESETS.map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto font-semibold tabular-nums">
          {t["meta.subtotal"]} {subtotal.toFixed(2)}€ · {t["meta.total"]} {total.toFixed(2)}€
        </span>
        {unpricedCount > 0 ? (
          <button
            type="button"
            onClick={scrollToFirstUnpriced}
            title={t["unpriced.scrollHint"]}
            className="cursor-pointer rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900/70"
          >
            ⚠ {unpricedCount} {unpricedCount === 1 ? t["unpriced.pill.one"] : t["unpriced.pill.other"]}
          </button>
        ) : null}
      </div>

      <DocSections />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        {chapters.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
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
          <div className="mt-8 space-y-8">
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
