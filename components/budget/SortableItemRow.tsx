"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { itemAmount } from "@/lib/calc";
import type { BudgetItem } from "@/lib/budget-types";
import { InlineNumber, InlineText, InlineUnit } from "./inline-fields";
import { ConfirmButton } from "./ConfirmButton";

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

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`${ITEM_GRID_CLS} border-t border-zinc-100 bg-white px-2 py-1`}
    >
      <button
        type="button"
        aria-label={`Drag item ${item.code}`}
        title="Drag to reorder"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded px-1 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 active:cursor-grabbing"
      >
        ⠿
      </button>
      <span className="px-1 py-1 text-zinc-500 tabular-nums">{item.code}</span>
      <span className="min-w-0">
        <InlineText
          value={item.title}
          onCommit={(title) => onUpdate(item.id, { title })}
          ariaLabel={`Item ${item.code} title`}
          required
          autoEdit={autoEditTitle}
          className="font-medium"
        />
        <InlineText
          value={item.description}
          onCommit={(description) => onUpdate(item.id, { description })}
          ariaLabel={`Item ${item.code} description`}
          placeholder="Add description…"
          className="text-zinc-500"
        />
      </span>
      <span className="py-1 text-center">
        <InlineUnit
          value={item.um}
          onCommit={(um) => onUpdate(item.id, { um })}
          ariaLabel={`Item ${item.code} unit of measure`}
        />
      </span>
      <InlineNumber
        value={item.quantity}
        onCommit={(quantity) => onUpdate(item.id, { quantity })}
        ariaLabel={`Item ${item.code} quantity`}
      />
      <InlineNumber
        value={item.price}
        onCommit={(price) => onUpdate(item.id, { price })}
        ariaLabel={`Item ${item.code} price`}
        format={(n) => `${n.toFixed(2)}€`}
      />
      <span className="px-1 py-1 text-right font-medium tabular-nums">
        {itemAmount(item).toFixed(2)}€
      </span>
      <span className="flex items-start justify-end">
        <button
          type="button"
          onClick={onToggleBreakdown}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} price breakdown for item ${item.code}`}
          title="Price breakdown (internal)"
          className="rounded px-1 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          {expanded ? "▾" : "▸"}
          {hasBreakdown && !expanded ? <span className="text-blue-500">•</span> : null}
        </button>
        <ConfirmButton
          label="✕"
          confirmLabel="Sure?"
          onConfirm={() => onRemoveItem(item.id)}
          ariaLabel={`Delete item ${item.code}`}
          className="rounded px-1 py-1 text-zinc-300 hover:bg-red-50 hover:text-red-600"
          confirmClassName="rounded bg-red-600 px-1.5 py-1 text-xs font-medium text-white hover:bg-red-500"
        />
      </span>
    </div>
  );
}
