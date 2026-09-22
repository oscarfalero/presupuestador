"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { itemAmount, isUnpriced } from "@/lib/calc";
import type { BudgetItem } from "@/lib/budget-types";
import { InlineNumber, InlineText, InlineUnit } from "./inline-fields";
import { ConfirmButton, TrashIcon } from "./ConfirmButton";
import { useStrings } from "@/lib/locale";

export const ITEM_GRID_CLS =
  "grid grid-cols-[1.75rem_3rem_minmax(0,1fr)_3.5rem_5.5rem_6.5rem_6rem_3.25rem] items-start gap-1";

interface SortableItemRowProps {
  item: BudgetItem;
  chapterId: string;
  expanded: boolean;
  hasBreakdown: boolean;
  autoEditTitle?: boolean;
  onToggleBreakdown: () => void;
  onRemoveItem: (id: string) => void;
  onUpdate: (id: string, patch: Partial<BudgetItem>) => void;
}

/** Draggable item row. The drag listeners live only on the grip handle,
 *  so click-to-edit keeps working everywhere else. */
export function SortableItemRow({ item, chapterId, expanded, hasBreakdown, autoEditTitle, onToggleBreakdown, onRemoveItem, onUpdate }: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "item", chapterId },
  });
  const unpriced = isUnpriced(item);
  const t = useStrings();
  const priceMissing = item.price === 0;
  const qtyMissing = item.quantity === 0;
  const warnCls =
    "rounded bg-amber-100 font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900/70";

  return (
    <div
      ref={setNodeRef}
      id={`item-row-${item.id}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`${ITEM_GRID_CLS} border-t border-zinc-100 px-2 py-1 dark:border-zinc-800 ${unpriced ? "bg-amber-50/70 dark:bg-amber-950/40" : "bg-white dark:bg-zinc-950"}`}
    >
      <button
        type="button"
        aria-label={`${t["item.drag"]} ${item.code}`}
        title={t["item.reorderHint"]}
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded px-1 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 active:cursor-grabbing dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        ⠿
      </button>
      <span className="px-1 py-1 text-zinc-500 tabular-nums dark:text-zinc-400">{item.code}</span>
      <span className="min-w-0">
        <InlineText
          value={item.title}
          onCommit={(title) => onUpdate(item.id, { title })}
          ariaLabel={`${t["item.titleField"]} ${item.code}`}
          required
          autoEdit={autoEditTitle}
          navId={`item:${item.id}:title`}
          className="font-medium"
        />
        <InlineText
          value={item.description}
          onCommit={(description) => onUpdate(item.id, { description })}
          ariaLabel={`${t["item.descField"]} ${item.code}`}
          placeholder={t["item.titlePlaceholder"]}
          navId={`item:${item.id}:desc`}
          multiline
          className="text-zinc-500 dark:text-zinc-400"
        />
      </span>
      <span className="py-1 text-center">
        <InlineUnit
          value={item.um}
          onCommit={(um) => onUpdate(item.id, { um })}
          ariaLabel={`${t["item.umField"]} ${item.code}`}
          navId={`item:${item.id}:um`}
        />
      </span>
      <InlineNumber
        value={item.quantity}
        onCommit={(quantity) => onUpdate(item.id, { quantity })}
        ariaLabel={`${t["item.qtyField"]} ${item.code}`}
        navId={`item:${item.id}:qty`}
        title={qtyMissing ? t["item.missingQty"] : undefined}
        className={qtyMissing ? warnCls : undefined}
      />
      <InlineNumber
        value={item.price}
        onCommit={(price) => onUpdate(item.id, { price })}
        ariaLabel={`${t["item.priceField"]} ${item.code}`}
        format={(n) => `${n.toFixed(2)}€`}
        navId={`item:${item.id}:price`}
        title={priceMissing ? t["item.missingPrice"] : undefined}
        className={priceMissing ? warnCls : undefined}
      />
      <span className="cursor-default px-1 py-1 text-right font-medium tabular-nums">
        {itemAmount(item).toFixed(2)}€
      </span>
      <span className="flex items-start justify-end">
        <button
          type="button"
          onClick={onToggleBreakdown}
          aria-expanded={expanded}
          aria-label={expanded ? `${t["detail.collapse"]} ${item.code}` : `${t["detail.expand"]} ${item.code}`}
          title={t["detail.toggle"]}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded px-1 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          {expanded ? "▾" : "▸"}
          {hasBreakdown && !expanded ? <span className="text-blue-500">•</span> : null}
        </button>
        <ConfirmButton
          label={<TrashIcon />}
          confirmLabel={
            <span className="inline-flex items-center gap-1">
              {t["item.deleteConfirm"]} <TrashIcon />
            </span>
          }
          onConfirm={() => onRemoveItem(item.id)}
          ariaLabel={`${t["item.delete"]} ${item.code}`}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          confirmClassName="rounded bg-red-600 px-1.5 py-1 text-xs font-medium text-white hover:bg-red-500"
        />
      </span>
    </div>
  );
}
