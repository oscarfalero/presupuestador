"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBudgetStore } from "@/lib/store";
import { budgetSubtotal, budgetTotalWithIva } from "@/lib/calc";
import { useStrings } from "@/lib/locale";
import { ConfirmButton, TrashIcon } from "./ConfirmButton";
import { CompanyBlock } from "./CompanyBlock";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleToggle } from "@/components/LocaleToggle";

/** Budgets index: create, open, duplicate and delete persisted budgets. */
export function BudgetsPage() {
  const { budgets, order, newBudget, duplicateBudget, removeBudget } = useBudgetStore();
  const t = useStrings();
  const router = useRouter();

  const create = () => {
    const id = newBudget(t["budgets.newName"]);
    router.push(`/budgets/${id}`);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 max-md:px-4">
      <CompanyBlock />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t["budgets.title"]}</h1>
        <div className="flex items-center gap-2">
          <LocaleToggle />
          <ThemeToggle />
          <button
            type="button"
            onClick={create}
            className="cursor-pointer rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {t["budgets.new"]}
          </button>
        </div>
      </header>

      {order.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <p className="text-lg font-medium">{t["budgets.emptyTitle"]}</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t["budgets.emptyBody"]}</p>
          <button
            type="button"
            onClick={create}
            className="mt-4 cursor-pointer rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {t["budgets.new"]}
          </button>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {order.map((id) => {
            const b = budgets[id];
            if (!b) return null;
            const total = budgetTotalWithIva(
              budgetSubtotal(b.items),
              b.ivaPct,
              b.ivaIncluded,
            );
            const meta = [b.number, b.clientName, b.date].filter((s) => s && s.trim() !== "").join(" · ");
            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 max-md:flex-wrap dark:border-zinc-800"
              >
                <div className="min-w-0 flex-1 max-md:basis-full">
                  <Link
                    href={`/budgets/${id}`}
                    className="block truncate font-semibold hover:underline"
                  >
                    {b.name}
                  </Link>
                  {meta ? (
                    <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{meta}</p>
                  ) : null}
                </div>
                <span className="font-semibold whitespace-nowrap tabular-nums max-md:flex-1">
                  {t["meta.total"]} {total.toFixed(2)}€
                </span>
                <button
                  type="button"
                  onClick={() => duplicateBudget(id, t["budgets.copySuffix"])}
                  title={t["budgets.duplicate"]}
                  aria-label={`${t["budgets.duplicate"]}: ${b.name}`}
                  className="cursor-pointer rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 max-md:min-h-[44px] max-md:px-4 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  {t["budgets.duplicate"]}
                </button>
                <ConfirmButton
                  label={<TrashIcon />}
                  confirmLabel={
                    <span className="inline-flex items-center gap-1">
                      {t["budgets.deleteConfirm"]} <TrashIcon />
                    </span>
                  }
                  onConfirm={() => removeBudget(id)}
                  ariaLabel={`${t["budgets.delete"]}: ${b.name}`}
                  className="inline-flex size-7 cursor-pointer items-center justify-center rounded text-zinc-500 hover:bg-red-50 hover:text-red-600 max-md:size-11 dark:hover:bg-red-950 dark:hover:text-red-400"
                  confirmClassName="rounded bg-red-600 px-2 py-1 text-xs font-medium whitespace-nowrap text-white hover:bg-red-500 max-md:px-4 max-md:py-3 max-md:text-sm"
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
