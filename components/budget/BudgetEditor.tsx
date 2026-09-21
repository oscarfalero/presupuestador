"use client";

import dynamic from "next/dynamic";
import { useBudgetStore } from "@/lib/store";
import { budgetSubtotal, budgetTotalWithIva, chapterSubtotal, itemAmount } from "@/lib/calc";
import { IVA_PRESETS } from "@/lib/budget-types";
import { exportBudgetToExcel } from "@/lib/exportExcel";
import { BudgetPdfDocument } from "./BudgetPdfDocument";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false },
);

/**
 * v0 placeholder editor: renders the budget from the store with
 * chapter subtotals and global VAT. Inline editing, drag & drop and
 * the internal breakdown panel land in upcoming issues.
 */
export function BudgetEditor() {
  const { budget, setMeta, addChapter } = useBudgetStore();
  const chapters = [...budget.chapters].sort((a, b) => a.order - b.order);
  const subtotal = budgetSubtotal(budget.items);
  const total = budgetTotalWithIva(subtotal, budget.ivaPct);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <input
            className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none focus:underline"
            value={budget.name}
            onChange={(e) => setMeta({ name: e.target.value })}
            aria-label="Budget name"
          />
          <input
            className="mt-1 w-full bg-transparent text-sm text-zinc-500 outline-none focus:underline"
            value={budget.details}
            onChange={(e) => setMeta({ details: e.target.value })}
            placeholder="Add description…"
            aria-label="Budget details"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            onClick={() => void exportBudgetToExcel(budget)}
          >
            Export Excel
          </button>
          <PDFDownloadLink
            document={<BudgetPdfDocument budget={budget} />}
            fileName="budget.pdf"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100"
          >
            {({ loading }) => (loading ? "Preparing PDF…" : "Export PDF")}
          </PDFDownloadLink>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Client
          <input
            className="rounded-md border border-zinc-300 px-2 py-1"
            value={budget.clientName}
            onChange={(e) => setMeta({ clientName: e.target.value })}
            placeholder="Optional"
          />
        </label>
        <label className="flex items-center gap-2">
          VAT
          <select
            className="rounded-md border border-zinc-300 px-2 py-1"
            value={budget.ivaPct}
            onChange={(e) => setMeta({ ivaPct: Number(e.target.value) })}
          >
            {IVA_PRESETS.map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto font-semibold">
          Subtotal {subtotal.toFixed(2)}€ · Total {total.toFixed(2)}€
        </span>
      </div>

      <div className="mt-8 space-y-8">
        {chapters.map((ch) => {
          const chItems = budget.items
            .filter((i) => i.chapterId === ch.id)
            .sort((a, b) => a.order - b.order);
          return (
            <section key={ch.id} className="overflow-hidden rounded-xl border border-zinc-200">
              <div className="flex items-center justify-between bg-zinc-50 px-4 py-3">
                <h2 className="font-semibold">
                  {ch.order + 1}. {ch.title}
                </h2>
                <span className="text-sm text-zinc-500">
                  Subtotal {chapterSubtotal(budget.items, ch.id).toFixed(2)}€
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">Code</th>
                    <th className="px-4 py-2 font-medium">Title</th>
                    <th className="px-4 py-2 font-medium">UM</th>
                    <th className="px-4 py-2 text-right font-medium">Qty</th>
                    <th className="px-4 py-2 text-right font-medium">Price</th>
                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {chItems.map((item) => (
                    <tr key={item.id} className="border-t border-zinc-100">
                      <td className="px-4 py-2 text-zinc-500">{item.code}</td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{item.title}</div>
                        {item.description ? (
                          <div className="text-zinc-500">{item.description}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2">{item.um}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">{item.price.toFixed(2)}€</td>
                      <td className="px-4 py-2 text-right font-medium">
                        {itemAmount(item).toFixed(2)}€
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      <button
        className="mt-6 rounded-full border border-dashed border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
        onClick={() => addChapter()}
      >
        + Add chapter
      </button>
    </div>
  );
}
