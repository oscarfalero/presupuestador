"use client";

import dynamic from "next/dynamic";
import { useBudgetStore } from "@/lib/store";
import { budgetSubtotal, budgetTotalWithIva, chapterSubtotal, itemAmount } from "@/lib/calc";
import { IVA_PRESETS } from "@/lib/budget-types";
import { exportBudgetToExcel } from "@/lib/exportExcel";
import { BudgetPdfDocument } from "./BudgetPdfDocument";
import { InlineNumber, InlineText, InlineUnit } from "./inline-fields";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false },
);

/**
 * Budget editor with inline editing (issue #1): every field is edited
 * in place — click to edit, Enter/blur to save, Esc to cancel.
 * Drag & drop (#2), breakdown panel (#3) and full CRUD (#4) come next.
 */
export function BudgetEditor() {
  const { budget, setMeta, renameChapter, updateItem } = useBudgetStore();
  const chapters = [...budget.chapters].sort((a, b) => a.order - b.order);
  const subtotal = budgetSubtotal(budget.items);
  const total = budgetTotalWithIva(subtotal, budget.ivaPct);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <InlineText
            value={budget.name}
            onCommit={(name) => setMeta({ name })}
            ariaLabel="Budget name"
            required
            className="text-3xl font-semibold tracking-tight"
          />
          <InlineText
            value={budget.details}
            onCommit={(details) => setMeta({ details })}
            ariaLabel="Budget details"
            placeholder="Add description…"
            className="mt-1 text-sm text-zinc-500"
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
            aria-label="Client name"
          />
        </label>
        <label className="flex items-center gap-2">
          Date
          <input
            type="date"
            className="rounded-md border border-zinc-300 px-2 py-1"
            value={budget.date}
            onChange={(e) => setMeta({ date: e.target.value })}
            aria-label="Budget date"
          />
        </label>
        <label className="flex items-center gap-2">
          VAT
          <select
            className="rounded-md border border-zinc-300 px-2 py-1"
            value={budget.ivaPct}
            onChange={(e) => setMeta({ ivaPct: Number(e.target.value) })}
            aria-label="VAT percentage"
          >
            {IVA_PRESETS.map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto font-semibold tabular-nums">
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
              <div className="flex items-center justify-between gap-3 bg-zinc-50 px-4 py-2">
                <span className="font-semibold whitespace-nowrap">{ch.order + 1}.</span>
                <div className="min-w-0 flex-1 font-semibold">
                  <InlineText
                    value={ch.title}
                    onCommit={(title) => renameChapter(ch.id, title)}
                    ariaLabel={`Chapter ${ch.order + 1} title`}
                    required
                  />
                </div>
                <span className="text-sm whitespace-nowrap text-zinc-500 tabular-nums">
                  Subtotal {chapterSubtotal(budget.items, ch.id).toFixed(2)}€
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">Code</th>
                    <th className="px-4 py-2 font-medium">Title</th>
                    <th className="px-4 py-2 text-center font-medium">UM</th>
                    <th className="px-4 py-2 text-right font-medium">Qty</th>
                    <th className="px-4 py-2 text-right font-medium">Price</th>
                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {chItems.map((item) => (
                    <tr key={item.id} className="border-t border-zinc-100 align-top">
                      <td className="px-4 py-2 whitespace-nowrap text-zinc-500 tabular-nums">
                        {item.code}
                      </td>
                      <td className="min-w-52 px-2 py-1.5">
                        <InlineText
                          value={item.title}
                          onCommit={(title) => updateItem(item.id, { title })}
                          ariaLabel={`Item ${item.code} title`}
                          required
                          className="font-medium"
                        />
                        <InlineText
                          value={item.description}
                          onCommit={(description) => updateItem(item.id, { description })}
                          ariaLabel={`Item ${item.code} description`}
                          placeholder="Add description…"
                          className="text-zinc-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <InlineUnit
                          value={item.um}
                          onCommit={(um) => updateItem(item.id, { um })}
                          ariaLabel={`Item ${item.code} unit of measure`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <InlineNumber
                          value={item.quantity}
                          onCommit={(quantity) => updateItem(item.id, { quantity })}
                          ariaLabel={`Item ${item.code} quantity`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <InlineNumber
                          value={item.price}
                          onCommit={(price) => updateItem(item.id, { price })}
                          ariaLabel={`Item ${item.code} price`}
                          format={(n) => `${n.toFixed(2)}€`}
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums">
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
    </div>
  );
}
