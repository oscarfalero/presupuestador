"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { chapterSubtotal } from "@/lib/calc";
import type { BudgetItem, Chapter, ItemBreakdown, MaterialCost } from "@/lib/budget-types";
import { InlineText } from "./inline-fields";
import { ITEM_GRID_CLS, SortableItemRow } from "./SortableItemRow";
import { ItemBreakdownPanel } from "./ItemBreakdownPanel";
import { ConfirmButton, TrashIcon } from "./ConfirmButton";
import { useStrings, useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/format";
import { requestEditFocus } from "@/lib/edit-focus";

interface ChapterBlockProps {
  chapter: Chapter;
  items: BudgetItem[];
  allItems: BudgetItem[];
  /** Freshly created section: plays the enter animation once. */
  fresh?: boolean;
  /** Removed section, kept mounted ~180ms for the exit animation. */
  leaving?: boolean;
  onRename: (id: string, title: string) => void;
  onAddItem: (chapterId: string, title: string) => string;
  onUpdateItem: (id: string, patch: Partial<BudgetItem>) => void;
  onRemoveItem: (id: string) => void;
  onRemoveChapter: (id: string) => void;
  onUpdateBreakdown: (itemId: string, patch: Partial<ItemBreakdown>) => void;
  onAddMaterial: (itemId: string) => void;
  onUpdateMaterial: (itemId: string, materialId: string, patch: Partial<MaterialCost>) => void;
  onRemoveMaterial: (itemId: string, materialId: string) => void;
}

/** Draggable chapter section. Whole-section drag via the header grip;
 *  items are independently sortable, including across chapters. */
export function ChapterBlock({ chapter, items, allItems, fresh, leaving, onRename, onAddItem, onUpdateItem, onRemoveItem, onRemoveChapter, onUpdateBreakdown, onAddMaterial, onUpdateMaterial, onRemoveMaterial }: ChapterBlockProps) {
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
  const t = useStrings();
  const locale = useLocale();
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  // Row entering (created this commit) and rows leaving (removed, kept
  // mounted ~180ms for the exit animation before the store removal).
  const [freshId, setFreshId] = useState<string | null>(null);
  const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set());
  const freshTimer = useRef<number | null>(null);
  const pendingRemovals = useRef(new Map<string, number>());

  // Leaving rows flush their real removal on unmount so a navigation
  // mid-animation never drops the delete. Store actions are stable,
  // so this runs once.
  useEffect(() => {
    const pending = pendingRemovals.current;
    return () => {
      for (const [id, timer] of pending) {
        window.clearTimeout(timer);
        onRemoveItem(id);
      }
      pending.clear();
    };
  }, [onRemoveItem]);

  useEffect(() => {
    const timer = freshTimer.current;
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);
  // Nav id of a row added this commit; focused via layout effect so the
  // fresh row opens in edit mode before paint (no prop drilling, no
  // prop-derived state).
  const pendingFocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (pendingFocus.current) {
      const navId = pendingFocus.current;
      pendingFocus.current = null;
      requestEditFocus(navId);
    }
  });

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAddItem = () => {
    const id = onAddItem(chapter.id, t["item.newTitle"]);
    pendingFocus.current = `item:${id}:title`;
    if (freshTimer.current !== null) window.clearTimeout(freshTimer.current);
    setFreshId(id);
    freshTimer.current = window.setTimeout(() => setFreshId(null), 250);
  };

  const handleRemoveItem = (id: string) => {
    if (pendingRemovals.current.has(id)) return;
    setLeavingIds((prev) => new Set(prev).add(id));
    pendingRemovals.current.set(
      id,
      window.setTimeout(() => {
        pendingRemovals.current.delete(id);
        setLeavingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        onRemoveItem(id);
      }, 180),
    );
  };

  return (
    <section
      ref={setSortRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950${fresh ? " anim-enter" : ""}${leaving ? " anim-leave" : ""}`}
    >
      <div className="flex items-center gap-2 bg-zinc-50 px-2 py-2 dark:bg-zinc-900">
        <button
          type="button"
          aria-label={`${t["chapter.drag"]} ${chapter.order + 1}`}
          title={t["chapter.reorderHint"]}
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded px-1 py-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 active:cursor-grabbing dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        >
          ⠿
        </button>
        <span className="font-semibold whitespace-nowrap tabular-nums">{chapter.order + 1}.</span>
        <div className="min-w-0 flex-1 font-semibold">
          <InlineText
            value={chapter.title}
            onCommit={(title) => onRename(chapter.id, title)}
            ariaLabel={`${t["chapter.titleField"]} ${chapter.order + 1}`}
            required
            navId={`chapter:${chapter.id}:title`}
          />
        </div>
        <span className="pr-2 font-bold whitespace-nowrap text-zinc-900 tabular-nums dark:text-zinc-100">
          {t["chapter.subtotal"]} {formatMoney(chapterSubtotal(allItems, chapter.id), locale)}
        </span>
        <ConfirmButton
          label={<TrashIcon />}
          confirmLabel={
            <span className="inline-flex items-center gap-1">
              {t["chapter.deleteConfirm"]} <TrashIcon />
            </span>
          }
          onConfirm={() => onRemoveChapter(chapter.id)}
          ariaLabel={`${t["chapter.delete"]} ${chapter.order + 1}`}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          confirmClassName="rounded bg-red-600 px-2 py-1 text-xs font-medium whitespace-nowrap text-white hover:bg-red-500"
        />
      </div>

      <div className={`${ITEM_GRID_CLS} px-2 py-1 text-left text-xs uppercase text-zinc-400 dark:text-zinc-500`}>
        <span />
        <span className="px-1 font-medium">{t["col.code"]}</span>
        <span className="px-1 font-medium">{t["col.title"]}</span>
        <span className="text-center font-medium">{t["col.um"]}</span>
        <span className="text-right font-medium">{t["col.qty"]}</span>
        <span className="text-right font-medium">{t["col.price"]}</span>
        <span className="px-1 text-right font-medium">{t["col.amount"]}</span>
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
                  fresh={freshId === item.id}
                  leaving={leavingIds.has(item.id)}
                  onToggleBreakdown={() => toggle(item.id)}
                  onRemoveItem={handleRemoveItem}
                  onUpdate={onUpdateItem}
                />
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 invisible"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <ItemBreakdownPanel
                      item={item}
                      onUpdateBreakdown={onUpdateBreakdown}
                      onAddMaterial={onAddMaterial}
                      onUpdateMaterial={onUpdateMaterial}
                      onRemoveMaterial={onRemoveMaterial}
                      onSyncPrice={(id, price) => onUpdateItem(id, { price })}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </SortableContext>
        {sorted.length === 0 ? (
          <p className="border-t border-dashed border-zinc-200 px-4 py-4 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            {t["chapter.dropHint"]}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleAddItem}
          className="w-full cursor-pointer border-t border-zinc-100 px-4 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          {t["item.add"]}
        </button>
      </div>
    </section>
  );
}
