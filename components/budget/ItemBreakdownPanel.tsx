"use client";

import { breakdownTotal } from "@/lib/calc";
import type { BudgetItem, ItemBreakdown, MaterialCost } from "@/lib/budget-types";
import { InlineNumber, InlineText } from "./inline-fields";
import { fmt } from "@/lib/i18n";
import { useStrings } from "@/lib/locale";

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
  const t = useStrings();

  if (!breakdown) {
    return (
      <div className="border-t border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/60">
        <p className="text-zinc-500 dark:text-zinc-400">{t["breakdown.empty"]}</p>
        <button
          type="button"
          onClick={() => onUpdateBreakdown(item.id, {})}
          className="mt-2 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          {t["breakdown.add"]}
        </button>
      </div>
    );
  }

  const total = breakdownTotal(breakdown);
  const diff = Math.round((total - item.price) * 100) / 100;
  const matches = Math.abs(diff) < 0.005;

  return (
    <div className="space-y-3 border-t border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/60">
      <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {t["breakdown.title"]}
      </p>

      <div>
        <div className="grid grid-cols-[minmax(0,1.4fr)_4rem_5rem_minmax(0,1fr)_5rem_2rem] gap-1 text-xs uppercase text-zinc-400 dark:text-zinc-500">
          <span className="px-1 font-medium">{t["breakdown.material"]}</span>
          <span className="text-right font-medium">{t["breakdown.qty"]}</span>
          <span className="text-right font-medium">{t["breakdown.price"]}</span>
          <span className="px-1 font-medium">{t["breakdown.source"]}</span>
          <span className="px-1 text-right font-medium">{t["breakdown.total"]}</span>
          <span />
        </div>
        {breakdown.materials.map((m) => (
          <div
            key={m.id}
            className="grid grid-cols-[minmax(0,1.4fr)_4rem_5rem_minmax(0,1fr)_5rem_2rem] items-start gap-1 border-t border-zinc-100 py-1 dark:border-zinc-800"
          >
            <InlineText
              value={m.description}
              onCommit={(description) => onUpdateMaterial(item.id, m.id, { description })}
              ariaLabel={`${t["breakdown.matDesc"]} ${item.code}`}
              placeholder={t["breakdown.materialDesc"]}
              navId={`item:${item.id}:mat:${m.id}:desc`}
            />
            <InlineNumber
              value={m.quantity}
              onCommit={(quantity) => onUpdateMaterial(item.id, m.id, { quantity })}
              ariaLabel={`${t["breakdown.matQty"]} ${item.code}`}
              navId={`item:${item.id}:mat:${m.id}:qty`}
            />
            <InlineNumber
              value={m.price}
              onCommit={(price) => onUpdateMaterial(item.id, m.id, { price })}
              ariaLabel={`${t["breakdown.matPrice"]} ${item.code}`}
              format={(n) => `${n.toFixed(2)}€`}
              navId={`item:${item.id}:mat:${m.id}:price`}
            />
            <span className="min-w-0">
              <InlineText
                value={m.sourceLabel ?? ""}
                onCommit={(sourceLabel) => onUpdateMaterial(item.id, m.id, { sourceLabel })}
                ariaLabel={`${t["breakdown.srcLabel"]} ${item.code}`}
                placeholder={t["breakdown.sourceLabel"]}
                navId={`item:${item.id}:mat:${m.id}:srclabel`}
                className="text-xs"
              />
              <InlineText
                value={m.sourceUrl ?? ""}
                onCommit={(sourceUrl) => onUpdateMaterial(item.id, m.id, { sourceUrl })}
                ariaLabel={`${t["breakdown.srcUrl"]} ${item.code}`}
                placeholder={t["breakdown.sourceUrl"]}
                navId={`item:${item.id}:mat:${m.id}:srcurl`}
                className="text-xs text-blue-700 dark:text-blue-400"
              />
            </span>
            <span className="px-1 py-1 text-right tabular-nums">
              {(m.quantity * m.price).toFixed(2)}€
            </span>
            <button
              type="button"
              onClick={() => onRemoveMaterial(item.id, m.id)}
              aria-label={`${t["breakdown.removeMaterial"]} ${item.code}`}
              title={t["breakdown.removeMaterial"]}
              className="rounded px-1 py-1 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onAddMaterial(item.id)}
          className="mt-1 rounded-full border border-dashed border-zinc-300 bg-white px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          {t["breakdown.addMaterial"]}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-2">
          {t["breakdown.labor"]}
          <span className="inline-flex items-center gap-1">
            <span className="w-16">
              <InlineNumber
                value={breakdown.labor.hours}
                onCommit={(hours) =>
                  onUpdateBreakdown(item.id, { labor: { ...breakdown.labor, hours } })
                }
                ariaLabel={`${t["breakdown.laborHours"]} ${item.code}`}
                navId={`item:${item.id}:labor:hours`}
              />
            </span>
            h ×
            <span className="w-20">
              <InlineNumber
                value={breakdown.labor.ratePerHour}
                onCommit={(ratePerHour) =>
                  onUpdateBreakdown(item.id, { labor: { ...breakdown.labor, ratePerHour } })
                }
                ariaLabel={`${t["breakdown.laborRate"]} ${item.code}`}
                format={(n) => `${n.toFixed(2)}€`}
                navId={`item:${item.id}:labor:rate`}
              />
            </span>
            /h =
            <strong className="tabular-nums">
              {(breakdown.labor.hours * breakdown.labor.ratePerHour).toFixed(2)}€
            </strong>
          </span>
        </span>
        <span className="flex items-center gap-2">
          {t["breakdown.other"]}
          <span className="w-20">
            <InlineNumber
              value={breakdown.otherCost}
              onCommit={(otherCost) => onUpdateBreakdown(item.id, { otherCost })}
              ariaLabel={`${t["breakdown.otherCosts"]} ${item.code}`}
              format={(n) => `${n.toFixed(2)}€`}
              navId={`item:${item.id}:other`}
            />
          </span>
        </span>
      </div>

      <div>
        <InlineText
          value={breakdown.notes}
          onCommit={(notes) => onUpdateBreakdown(item.id, { notes })}
          ariaLabel={`${t["breakdown.notesField"]} ${item.code}`}
          placeholder={t["breakdown.notesPlaceholder"]}
          navId={`item:${item.id}:notes`}
          className="text-zinc-600 dark:text-zinc-300"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
        <span className="tabular-nums">
          {t["breakdown.totalLabel"]} <strong>{total.toFixed(2)}€</strong> · {t["breakdown.priceLabel"]}{" "}
          <strong>{item.price.toFixed(2)}€</strong>
        </span>
        {matches ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/50 dark:text-green-200">
            {t["breakdown.matches"]}
          </span>
        ) : (
          <>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-100">
              {t["breakdown.differs"]} {diff.toFixed(2)}€
            </span>
            <button
              type="button"
              onClick={() => onSyncPrice(item.id, total)}
              className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {fmt(t["breakdown.useTotal"], { n: `${total.toFixed(2)}€` })}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
