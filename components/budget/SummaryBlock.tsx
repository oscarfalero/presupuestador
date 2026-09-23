"use client";

import { IVA_PRESETS } from "@/lib/budget-types";
import { budgetSubtotal, budgetTotalWithIva, round2 } from "@/lib/calc";
import { useBudgetStore } from "@/lib/store";
import { useStrings } from "@/lib/locale";
import { InlineText } from "./inline-fields";

/**
 * Executive summary card: final price block (subtotal, VAT picker,
 * total) plus the commercial free-text blocks (terms, payment).
 * The header contact/address block no longer carries pricing.
 */
export function SummaryBlock() {
  const { budget, setMeta } = useBudgetStore();
  const t = useStrings();
  const subtotal = budgetSubtotal(budget.items);
  const vatAmount = round2(subtotal * (budget.ivaPct / 100));
  const total = budgetTotalWithIva(subtotal, budget.ivaPct, budget.ivaIncluded);

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="space-y-1 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <span>{t["meta.subtotal"]}:</span>
          <span className="tabular-nums">{subtotal.toFixed(2)}€</span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <label className="flex items-center gap-2">
            {t["meta.vat"]}
            <select
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 dark:[&>option]:bg-zinc-900"
              value={budget.ivaIncluded ? String(budget.ivaPct) : "excluded"}
              onChange={(e) =>
                e.target.value === "excluded"
                  ? setMeta({ ivaIncluded: false })
                  : setMeta({ ivaIncluded: true, ivaPct: Number(e.target.value) })
              }
              aria-label={t["meta.vat"]}
              data-nav-id="meta:vat"
            >
              <option value="excluded">{t["totals.vatExcludedOption"]}</option>
              {IVA_PRESETS.map((v) => (
                <option key={v} value={v}>
                  {v}%
                </option>
              ))}
            </select>
            :
          </label>
          {budget.ivaIncluded ? (
            <span className="tabular-nums">{vatAmount.toFixed(2)}€</span>
          ) : (
            <span className="text-xs font-normal text-zinc-500 uppercase dark:text-zinc-400">
              {t["totals.vatExcluded"].toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-3 text-xl font-bold">
          <span>{t["meta.total"]}:</span>
          <span className="tabular-nums">{total.toFixed(2)}€</span>
        </div>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {t["section.terms"]}
        </h3>
        <div className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">
          <InlineText
            value={budget.terms ?? ""}
            onCommit={(terms) => setMeta({ terms })}
            ariaLabel={t["section.terms"]}
            placeholder={t["section.termsPh"]}
            multiline
            navId="meta:terms"
          />
        </div>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {t["section.payment"]}
        </h3>
        <div className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">
          <InlineText
            value={budget.payment ?? ""}
            onCommit={(payment) => setMeta({ payment })}
            ariaLabel={t["section.payment"]}
            placeholder={t["section.paymentPh"]}
            multiline
            navId="meta:payment"
          />
        </div>
      </div>
    </div>
  );
}
