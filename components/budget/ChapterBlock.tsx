"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { chapterSubtotal } from "@/lib/calc";
import type { BudgetItem, Chapter, ItemBreakdown, MaterialCost } from "@/lib/budget-types";
import { InlineText } from "./inline-fields";
import { ITEM_GRID_CLS, SortableItemRow } from "./SortableItemRow";
import { ItemBreakdownPanel } from "./ItemBreakdownPanel";

interface ChapterBlockProps {
  chapter: Chapter;
  items: BudgetItem[];
  allItems: BudgetItem[];
  onRename: (id: string, title: string) => void;
  onUpdateItem: (id: string, patch: Partial<BudgetItem>) => void;
  onUpdateBreakdown: (itemId: string, patch: Partial<ItemBreakdown>) => void;
  onAddMaterial: (itemId: string) => void;
  onUpdateMaterial: (itemId: string, materialId: string, patch: Partial<MaterialCost>) => void;
  onRemoveMaterial: (itemId: string, materialId: string) => void;
}

/** Draggable chapter section. Whole-section drag via the header grip;
 *  items are independently sortable, including across chapters. */
export function ChapterBlock({ chapter, items, allItems, onRename, onUpdateItem, onUpdateBreakdown, onAddMaterial, onUpdateMaterial, onRemoveMaterial }: ChapterBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id, data: { type: "chapter" } });

  // Drop target for appending items (also covers empty chapters).
  const { setNodeRef: setDropRef } = useDroppable({ id: `chapter-drop-${chapter.id}` });

  const sorted = [...items].sort((a, b) => a.order - b.order);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section
      ref={setSortRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
    >
      <div className="flex items-center gap-2 bg-zinc-50 px-2 py-2">
        <button
          type="button"
          aria-label={`Drag chapter ${chapter.order + 1}`}
          title="Drag to reorder chapter"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded px-1 py-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 active:cursor-grabbing"
        >
          ⠿
        </button>
        <span className="font-semibold whitespace-nowrap tabular-nums">{chapter.order + 1}.</span>
        <div className="min-w-0 flex-1 font-semibold">
          <InlineText
            value={chapter.title}
            onCommit={(title) => onRename(chapter.id, title)}
            ariaLabel={`Chapter ${chapter.order + 1} title`}
            required
          />
        </div>
        <span className="pr-2 text-sm whitespace-nowrap text-zinc-500 tabular-nums">
          Subtotal {chapterSubtotal(allItems, chapter.id).toFixed(2)}€
        </span>
      </div>

      <div className={`${ITEM_GRID_CLS} px-2 py-1 text-left text-xs uppercase text-zinc-400`}>
        <span />
        <span className="px-1 font-medium">Code</span>
        <span className="px-1 font-medium">Title</span>
        <span className="text-center font-medium">UM</span>
        <span className="text-right font-medium">Qty</span>
        <span className="text-right font-medium">Price</span>
        <span className="px-1 text-right font-medium">Amount</span>
        <span />
      </div>

      <div ref={setDropRef}>
        <SortableContext items={sorted.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {sorted.map((item) => {
            const open = openIds.has(item.id);
            return (
              <div key={item.id}>
                <SortableItemRow
                  item={item}
                  chapterId={chapter.id}
                  expanded={open}
                  hasBreakdown={!!item.breakdown}
                  onToggleBreakdown={() => toggle(item.id)}
                  onUpdate={onUpdateItem}
                />
                {open ? (
                  <ItemBreakdownPanel
                    item={item}
                    onUpdateBreakdown={onUpdateBreakdown}
                    onAddMaterial={onAddMaterial}
                    onUpdateMaterial={onUpdateMaterial}
                    onRemoveMaterial={onRemoveMaterial}
                    onSyncPrice={(id, price) => onUpdateItem(id, { price })}
                  />
                ) : null}
              </div>
            );
          })}
        </SortableContext>
        {sorted.length === 0 ? (
          <p className="border-t border-dashed border-zinc-200 px-4 py-4 text-center text-sm text-zinc-400">
            Drop items here
          </p>
        ) : null}
      </div>
    </section>
  );
}
