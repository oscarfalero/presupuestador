"use client";

import { breakdownTotal } from "@/lib/calc";
import { withProtocol } from "@/lib/urls";
import type { BudgetItem, ItemBreakdown, MaterialCost } from "@/lib/budget-types";
import { InlineNumber, InlineText } from "./inline-fields";
import { ITEM_GRID_CLS } from "./SortableItemRow";
import { ConfirmButton, TrashIcon } from "./ConfirmButton";
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

const TAB_BOX_CLS =
  "rounded-b-xl border border-t-0 border-cyan-200 bg-cyan-50 dark:border-cyan-900 dark:bg-cyan-950/40";

/**
 * Editor-only tab explaining how an item price was reached. Indented under
 * the title..amount columns (code column left empty), with its own margins
 * and rounded bottom corners. Never leaves the editor: exports are built
 * from the client-safe model (`lib/clientExport.ts`).
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
      <div className={`${ITEM_GRID_CLS} mb-2 px-2 max-md:block max-md:px-0`}>
        <span className="max-md:hidden" />
        <span className="max-md:hidden" />
        <div className={`col-span-5 px-4 py-3 text-sm max-md:col-span-full ${TAB_BOX_CLS}`}>
          <p className="text-zinc-500 dark:text-zinc-400">{t["breakdown.empty"]}</p>
          <button
            type="button"
            onClick={() => onUpdateBreakdown(item.id, {})}
            className="mt-2 cursor-pointer rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium max-md:min-h-[44px] max-md:px-4 max-md:text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {t["breakdown.add"]}
          </button>
        </div>
        <span className="max-md:hidden" />
      </div>
    );
  }

  const total = breakdownTotal(breakdown);
  const diff = Math.round((total - item.price) * 100) / 100;
  const matches = Math.abs(diff) < 0.005;

  return (
    <div className={`${ITEM_GRID_CLS} mb-2 px-2 max-md:block max-md:px-0`}>
      <span className="max-md:hidden" />
      <span className="max-md:hidden" />
      <div className={`col-span-5 space-y-3 px-4 py-3 text-sm max-md:col-span-full ${TAB_BOX_CLS}`}>
        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {t["breakdown.title"]}
        </p>

        <div>
          <div className="grid grid-cols-[minmax(0,1.4fr)_4rem_5rem_minmax(0,1fr)_5rem_2rem] gap-1 text-xs uppercase text-zinc-400 max-md:hidden dark:text-zinc-500">
            <span className="px-1 font-medium">{t["breakdown.material"]}</span>
            <span className="text-right font-medium">{t["breakdown.qty"]}</span>
            <span className="text-right font-medium">{t["breakdown.price"]}</span>
            <span className="px-1 font-medium">{t["breakdown.source"]}</span>
            <span className="px-1 text-right font-medium">{t["breakdown.total"]}</span>
            <span />
          </div>
          {breakdown.materials.map((m) => {
            const url = (m.sourceUrl ?? "").trim();
            return (
              <div
                key={m.id}
                className="grid grid-cols-[minmax(0,1.4fr)_4rem_5rem_minmax(0,1fr)_5rem_2rem] items-start gap-1 border-t border-zinc-100 py-1 max-md:grid-cols-2 max-md:gap-2 dark:border-zinc-800"
              >
                <span className="md:contents max-md:col-span-2 max-md:flex max-md:flex-col">
                  <span className="hidden max-md:block max-md:text-[11px] max-md:font-medium max-md:uppercase max-md:text-zinc-400 max-md:dark:text-zinc-500">{t["breakdown.material"]}</span>
                <InlineText
                  value={m.description}
                  onCommit={(description) => onUpdateMaterial(item.id, m.id, { description })}
                  ariaLabel={`${t["breakdown.matDesc"]} ${item.code}`}
                  placeholder={t["breakdown.materialDesc"]}
                  navId={`item:${item.id}:mat:${m.id}:desc`}
                />
                </span>
                <span className="md:contents max-md:flex max-md:flex-col">
                  <span className="hidden max-md:block max-md:text-[11px] max-md:font-medium max-md:uppercase max-md:text-zinc-400 max-md:dark:text-zinc-500">{t["breakdown.qty"]}</span>
                <InlineNumber
                  value={m.quantity}
                  onCommit={(quantity) => onUpdateMaterial(item.id, m.id, { quantity })}
                  ariaLabel={`${t["breakdown.matQty"]} ${item.code}`}
                  navId={`item:${item.id}:mat:${m.id}:qty`}
                />
                </span>
                <span className="md:contents max-md:flex max-md:flex-col">
                  <span className="hidden max-md:block max-md:text-[11px] max-md:font-medium max-md:uppercase max-md:text-zinc-400 max-md:dark:text-zinc-500">{t["breakdown.price"]}</span>
                <InlineNumber
                  value={m.price}
                  onCommit={(price) => onUpdateMaterial(item.id, m.id, { price })}
                  ariaLabel={`${t["breakdown.matPrice"]} ${item.code}`}
                  format={(n) => `${n.toFixed(2)}€`}
                  navId={`item:${item.id}:mat:${m.id}:price`}
                />
                </span>
                <span className="min-w-0 max-md:col-span-2">
                  <InlineText
                    value={m.sourceLabel ?? ""}
                    onCommit={(sourceLabel) => onUpdateMaterial(item.id, m.id, { sourceLabel })}
                    ariaLabel={`${t["breakdown.srcLabel"]} ${item.code}`}
                    placeholder={t["breakdown.sourceLabel"]}
                    navId={`item:${item.id}:mat:${m.id}:srclabel`}
                    className="text-xs"
                  />
                  <span className="flex items-start gap-1">
                    <span className="min-w-0 flex-1">
                      <InlineText
                        value={m.sourceUrl ?? ""}
                        onCommit={(sourceUrl) => onUpdateMaterial(item.id, m.id, { sourceUrl })}
                        ariaLabel={`${t["breakdown.srcUrl"]} ${item.code}`}
                        placeholder={t["breakdown.sourceUrl"]}
                        navId={`item:${item.id}:mat:${m.id}:srcurl`}
                        title={url || undefined}
                        className="truncate text-xs text-blue-700 dark:text-blue-400"
                      />
                    </span>
                    {url ? (
                      <ConfirmButton
                        label="↗"
                        confirmLabel={t["breakdown.visitConfirm"]}
                        onConfirm={() => window.open(withProtocol(url), "_blank", "noopener,noreferrer")}
                        ariaLabel={`${t["breakdown.visit"]}: ${m.sourceLabel || url}`}
                        title={t["breakdown.visit"]}
                        className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-white hover:bg-zinc-700 max-md:min-h-[44px] max-md:px-4 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                        confirmClassName="rounded bg-zinc-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-white hover:bg-zinc-700 max-md:min-h-[44px] max-md:px-4 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                      />
                    ) : null}
                  </span>
                </span>
                <span className="px-1 py-1 text-right tabular-nums max-md:self-center max-md:px-0">
                  {(m.quantity * m.price).toFixed(2)}€
                </span>
                <ConfirmButton
                  label={<TrashIcon />}
                  confirmLabel={
                    <span className="inline-flex items-center gap-1">
                      {t["breakdown.removeConfirm"]} <TrashIcon />
                    </span>
                  }
                  onConfirm={() => onRemoveMaterial(item.id, m.id)}
                  ariaLabel={`${t["breakdown.removeMaterial"]} ${item.code}`}
                  title={t["breakdown.removeMaterial"]}
                  className="inline-flex size-7 cursor-pointer items-center justify-center justify-self-end rounded text-zinc-500 hover:bg-red-50 hover:text-red-600 max-md:size-11 dark:hover:bg-red-950 dark:hover:text-red-400"
                  confirmClassName="rounded bg-red-600 px-2 py-1 text-xs font-medium whitespace-nowrap text-white hover:bg-red-500 justify-self-end max-md:px-4 max-md:py-3 max-md:text-sm"
                />
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => onAddMaterial(item.id)}
            className="mt-1 cursor-pointer rounded-full border border-dashed border-zinc-300 bg-white px-3 py-1 text-xs font-medium max-md:min-h-[44px] max-md:px-4 max-md:text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
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
            multiline
            className="text-zinc-600 dark:text-zinc-300"
          />
        </div>

        {!matches ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
            <span className="tabular-nums">
              {t["breakdown.totalLabel"]} <strong>{total.toFixed(2)}€</strong> · {t["breakdown.priceLabel"]}{" "}
              <strong>{item.price.toFixed(2)}€</strong>
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-100">
              {t["breakdown.differs"]} {diff.toFixed(2)}€
            </span>
            <button
              type="button"
              onClick={() => onSyncPrice(item.id, total)}
              className="cursor-pointer rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium max-md:min-h-[44px] max-md:px-4 max-md:text-sm text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {fmt(t["breakdown.useTotal"], { n: `${total.toFixed(2)}€` })}
            </button>
          </div>
        ) : null}
      </div>
      <span className="max-md:hidden" />
    </div>
  );
}
