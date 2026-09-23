"use client";

import { selectActiveBudget, useBudgetStore } from "@/lib/store";
import { useStrings } from "@/lib/locale";
import { InlineText } from "./inline-fields";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleToggle } from "@/components/LocaleToggle";

interface EditorHeaderProps {
  exporting: null | "excel" | "pdf";
  onExportExcel: () => void;
  onExportPdf: () => void;
}

/** Title, locale/theme toggles and the Excel/PDF export actions. */
export function EditorHeader({ exporting, onExportExcel, onExportPdf }: EditorHeaderProps) {
  const { setMeta } = useBudgetStore();
  const budget = useBudgetStore(selectActiveBudget);
  const t = useStrings();
  if (!budget) return null;

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 flex-1">
        <InlineText
          value={budget.name}
          onCommit={(name) => setMeta({ name })}
          ariaLabel={t["budget.name"]}
          required
          navId="meta:name"
          className="text-3xl font-semibold tracking-tight"
        />
      </div>
      <div className="flex items-center gap-2">
        <LocaleToggle />
        <ThemeToggle />
        <button
          className="cursor-pointer rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          disabled={exporting !== null}
          onClick={onExportExcel}
        >
          {exporting === "excel" ? t["header.preparing"] : t["header.exportExcel"]}
        </button>
        <button
          className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
          disabled={exporting !== null}
          onClick={onExportPdf}
        >
          {exporting === "pdf" ? t["header.preparingPdf"] : t["header.exportPdf"]}
        </button>
      </div>
    </header>
  );
}
