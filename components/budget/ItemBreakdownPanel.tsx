"use client";

import { breakdownTotal } from "@/lib/calc";
import type { BudgetItem, ItemBreakdown, MaterialCost } from "@/lib/budget-types";
import { InlineNumber, InlineText } from "./inline-fields";

interface ItemBreakdownPanelProps {
  item: BudgetItem;
  onUpdateBreakdown: (itemId: string, patch: Partial<ItemBreakdown>) => void;
  onAddMaterial: (itemId: string) => void;
  onUpdateMaterial: (itemId: string, materialId: string, patch: Partial<MaterialCost>) => void;
  onRemoveMaterial: (itemId: string, materialId: string) => void;
  onSyncPrice: (itemId: string, price: number) => void;
}

/**
 * Editor-only panel explaining how an item price was reached.
 * Never leaves the editor: exports are built from the client-safe
 * model (`lib/clientExport.ts`), which excludes this data.
 */
export function ItemBreakdownPanel({
  item,
  onUpdateBreakdown,
  onAddMaterial,
  onUpdateMaterial,
  onRemoveMaterial,
  onSyncPrice,
}: ItemBreakdownPanelProps) {
  const breakdown = item.breakdown;

  if (!breakdown) {
    return (
      <div className="border-t border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-3 text-sm">
        <p className="text-zinc-500">No price breakdown yet — document how this price was calculated.</p>
        <button
          type="button"
          onClick={() => onUpdateBreakdown(item.id, {})}
          className="mt-2 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium hover:bg-zinc-100"
        >
          + Add breakdown
        </button>
      </div>
    );
  }

  const total = breakdownTotal(breakdown);
  const diff = Math.round((total - item.price) * 100) / 100;
  const matches = Math.abs(diff) < 0.005;

  return (
    <div className="space-y-3 border-t border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-3 text-sm">
      <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        Price breakdown · internal, not exported
      </p>

      <div>
        <div className="grid grid-cols-[minmax(0,1.4fr)_4rem_5rem_minmax(0,1fr)_5rem_2rem] gap-1 text-xs uppercase text-zinc-400">
          <span className="px-1 font-medium">Material</span>
          <span className="text-right font-medium">Qty</span>
          <span className="text-right font-medium">Price</span>
          <span className="px-1 font-medium">Source</span>
          <span className="px-1 text-right font-medium">Total</span>
          <span />
        </div>
        {breakdown.materials.map((m) => (
          <div
            key={m.id}
            className="grid grid-cols-[minmax(0,1.4fr)_4rem_5rem_minmax(0,1fr)_5rem_2rem] items-start gap-1 border-t border-zinc-100 py-1"
          >
            <InlineText
              value={m.description}
              onCommit={(description) => onUpdateMaterial(item.id, m.id, { description })}
              ariaLabel={`Material description for item ${item.code}`}
              placeholder="e.g. Glass shower screen 120cm"
            />
            <InlineNumber
              value={m.quantity}
              onCommit={(quantity) => onUpdateMaterial(item.id, m.id, { quantity })}
              ariaLabel={`Material quantity for item ${item.code}`}
            />
            <InlineNumber
              value={m.price}
              onCommit={(price) => onUpdateMaterial(item.id, m.id, { price })}
              ariaLabel={`Material price for item ${item.code}`}
              format={(n) => `${n.toFixed(2)}€`}
            />
            <span className="min-w-0">
              <InlineText
                value={m.sourceLabel ?? ""}
                onCommit={(sourceLabel) => onUpdateMaterial(item.id, m.id, { sourceLabel })}
                ariaLabel={`Material source label for item ${item.code}`}
                placeholder="Supplier / reference"
                className="text-xs"
              />
              <InlineText
                value={m.sourceUrl ?? ""}
                onCommit={(sourceUrl) => onUpdateMaterial(item.id, m.id, { sourceUrl })}
                ariaLabel={`Material source URL for item ${item.code}`}
                placeholder="https://…"
                className="text-xs text-blue-700"
              />
            </span>
            <span className="px-1 py-1 text-right tabular-nums">
              {(m.quantity * m.price).toFixed(2)}€
            </span>
            <button
              type="button"
              onClick={() => onRemoveMaterial(item.id, m.id)}
              aria-label={`Remove material from item ${item.code}`}
              title="Remove material"
              className="rounded px-1 py-1 text-zinc-500 hover:bg-red-50 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onAddMaterial(item.id)}
          className="mt-1 rounded-full border border-dashed border-zinc-300 bg-white px-3 py-1 text-xs font-medium hover:bg-zinc-100"
        >
          + Add material
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-2">
          Labor
          <span className="inline-flex items-center gap-1">
            <span className="w-16">
              <InlineNumber
                value={breakdown.labor.hours}
                onCommit={(hours) =>
                  onUpdateBreakdown(item.id, { labor: { ...breakdown.labor, hours } })
                }
                ariaLabel={`Labor hours for item ${item.code}`}
              />
            </span>
            h ×
            <span className="w-20">
              <InlineNumber
                value={breakdown.labor.ratePerHour}
                onCommit={(ratePerHour) =>
                  onUpdateBreakdown(item.id, { labor: { ...breakdown.labor, ratePerHour } })
                }
                ariaLabel={`Labor rate per hour for item ${item.code}`}
                format={(n) => `${n.toFixed(2)}€`}
              />
            </span>
            /h =
            <strong className="tabular-nums">
              {(breakdown.labor.hours * breakdown.labor.ratePerHour).toFixed(2)}€
            </strong>
          </span>
        </span>
        <span className="flex items-center gap-2">
          Other costs
          <span className="w-20">
            <InlineNumber
              value={breakdown.otherCost}
              onCommit={(otherCost) => onUpdateBreakdown(item.id, { otherCost })}
              ariaLabel={`Other costs for item ${item.code}`}
              format={(n) => `${n.toFixed(2)}€`}
            />
          </span>
        </span>
      </div>

      <div>
        <InlineText
          value={breakdown.notes}
          onCommit={(notes) => onUpdateBreakdown(item.id, { notes })}
          ariaLabel={`Breakdown notes for item ${item.code}`}
          placeholder="Explain the calculation… e.g. 289 + 4h × 35 = 140 + sealing 21 ⇒ 450"
          className="text-zinc-600"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-2">
        <span className="tabular-nums">
          Breakdown total <strong>{total.toFixed(2)}€</strong> · Item price{" "}
          <strong>{item.price.toFixed(2)}€</strong>
        </span>
        {matches ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            ✓ matches
          </span>
        ) : (
          <>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              ⚠ differs by {diff.toFixed(2)}€
            </span>
            <button
              type="button"
              onClick={() => onSyncPrice(item.id, total)}
              className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700"
            >
              Use {total.toFixed(2)}€ as price
            </button>
          </>
        )}
      </div>
    </div>
  );
}
