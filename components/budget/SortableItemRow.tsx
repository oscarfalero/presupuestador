"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { itemAmount, isUnpriced } from "@/lib/calc";
import type { BudgetItem } from "@/lib/budget-types";
import { InlineNumber, InlineText, InlineUnit } from "./inline-fields";
import { ConfirmButton, TrashIcon } from "./ConfirmButton";
import { useLocale, useStrings } from "@/lib/locale";
import { formatMoney, formatQty } from "@/lib/format";

export const ITEM_GRID_CLS =
  "grid grid-cols-[1.75rem_3rem_minmax(0,1fr)_3.5rem_5.5rem_6.5rem_6rem_3.25rem] items-start gap-1";

/** Itemized-receipt icon for the internal breakdown toggle. */
function ReceiptIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 3h14v18l-2.3-1.4-2.4 1.4-2.3-1.4-2.3 1.4-2.4-1.4L5 21z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

interface SortableItemRowProps {
  item: BudgetItem;
  chapterId: string;
  expanded: boolean;
  /** Freshly created row: plays the enter animation once. */
  fresh?: boolean;
  /** Removed row, kept mounted ~180ms for the exit animation. */
  leaving?: boolean;
  onToggleBreakdown: () => void;
  onRemoveItem: (id: string) => void;
  onUpdate: (id: string, patch: Partial<BudgetItem>) => void;
}

/** Draggable item row. The drag listeners live only on the grip handle,
 *  so click-to-edit keeps working everywhere else. */
export function SortableItemRow({ item, chapterId, expanded, fresh, leaving, onToggleBreakdown, onRemoveItem, onUpdate }: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "item", chapterId },
  });
  const unpriced = isUnpriced(item);
  const t = useStrings();
  const locale = useLocale();
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
      className={`${ITEM_GRID_CLS} border-t border-zinc-100 px-2 py-1 dark:border-zinc-800 ${unpriced ? "bg-amber-50/70 dark:bg-amber-950/40" : "bg-white dark:bg-zinc-950"}${fresh ? " anim-enter" : ""}${leaving ? " anim-leave" : ""}`}
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
      <span className="text-center">
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
        format={(n) => formatQty(n, locale)}
        navId={`item:${item.id}:qty`}
        title={qtyMissing ? t["item.missingQty"] : undefined}
        className={qtyMissing ? warnCls : undefined}
      />
      <InlineNumber
        value={item.price}
        onCommit={(price) => onUpdate(item.id, { price })}
        ariaLabel={`${t["item.priceField"]} ${item.code}`}
        format={(n) => formatMoney(n, locale)}
        navId={`item:${item.id}:price`}
        title={priceMissing ? t["item.missingPrice"] : undefined}
        className={priceMissing ? warnCls : undefined}
      />
      <span className="cursor-default px-1 py-0.5 text-right font-bold tabular-nums">
        {formatMoney(itemAmount(item), locale)}
      </span>
      <span className="flex flex-col items-end justify-between self-stretch">
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
          confirmClassName="rounded bg-red-600 px-2 py-1 text-xs font-medium whitespace-nowrap text-white hover:bg-red-500"
        />
        <button
          type="button"
          onClick={onToggleBreakdown}
          aria-expanded={expanded}
          aria-label={expanded ? `${t["detail.collapse"]} ${item.code}` : `${t["detail.expand"]} ${item.code}`}
          title={t["detail.toggle"]}
          className={`inline-flex size-7 cursor-pointer items-center justify-center px-1 py-1 ${
            expanded
              ? "rounded-t bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"
              : "rounded text-zinc-400 hover:bg-cyan-50 hover:text-cyan-700 dark:text-zinc-500 dark:hover:bg-cyan-950/40 dark:hover:text-cyan-300"
          }`}
        >
          <ReceiptIcon />
        </button>
      </span>
    </div>
  );
}
