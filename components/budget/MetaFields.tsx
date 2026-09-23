"use client";

import { useBudgetStore } from "@/lib/store";
import { isUnpriced } from "@/lib/calc";
import { useStrings } from "@/lib/locale";

/** Number/date/client/address fields plus the unpriced-items pill. */
export function MetaFields() {
  const { budget, setMeta } = useBudgetStore();
  const t = useStrings();
  const unpricedCount = budget.items.filter(isUnpriced).length;

  const scrollToFirstUnpriced = () => {
    const first = budget.items.find(isUnpriced);
    if (first)
      document.getElementById(`item-row-${first.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <>
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
    </>
  );
}
