"use client";

import { useState } from "react";
import { useBudgetStore } from "@/lib/store";
import { useStrings } from "@/lib/locale";
import { InlineText } from "./inline-fields";
import type { StringKey } from "@/lib/i18n";

const BLOCKS: { field: "intro" | "terms" | "payment"; titleKey: StringKey; phKey: StringKey; navId: string }[] = [
  { field: "intro", titleKey: "section.intro", phKey: "section.introPh", navId: "meta:intro" },
  { field: "terms", titleKey: "section.terms", phKey: "section.termsPh", navId: "meta:terms" },
  { field: "payment", titleKey: "section.payment", phKey: "section.paymentPh", navId: "meta:payment" },
];

/**
 * Single collapsible section holding the free-text document blocks
 * (intro, terms, payment). Open by default only while all are empty.
 */
export function DocSections() {
  const { budget, setMeta } = useBudgetStore();
  const t = useStrings();
  // Tolerant reader: very old snapshots may miss these keys when the
  // persist merge is bypassed (the merge normally backfills them).
  const textOf = (field: "intro" | "terms" | "payment"): string => budget[field] ?? "";
  const [open, setOpen] = useState(() => !(textOf("intro") || textOf("terms") || textOf("payment")));
  const filled = BLOCKS.filter((b) => textOf(b.field).trim() !== "").length;

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2 bg-zinc-50 px-4 py-2 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-sm font-semibold"
        >
          <span aria-hidden>{open ? "▾" : "▸"}</span>
          <span>{t["section.docs"]}</span>
          {!open && filled > 0 ? (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {filled}/3
            </span>
          ) : null}
        </button>
      </div>
      {open ? (
        <div className="space-y-5 px-4 py-3">
          {BLOCKS.map((b) => (
            <div key={b.field}>
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  {t[b.titleKey]}
                </h3>
                {textOf(b.field) ? (
                  <button
                    type="button"
                    onClick={() => setMeta({ [b.field]: "" } as Partial<typeof budget>)}
                    className="cursor-pointer rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  >
                    {t["section.remove"]}
                  </button>
                ) : null}
              </div>
              <div className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">
                <InlineText
                  value={textOf(b.field)}
                  onCommit={(next) => setMeta({ [b.field]: next } as Partial<typeof budget>)}
                  ariaLabel={t[b.titleKey]}
                  placeholder={t[b.phKey]}
                  multiline
                  navId={b.navId}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
