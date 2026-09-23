"use client";

import { selectActiveBudget, useBudgetStore } from "@/lib/store";
import { useStrings } from "@/lib/locale";
import { InlineText } from "./inline-fields";

/** Free-text presentation shown unlabeled in the exports. */
export function IntroSection() {
  const { setMeta } = useBudgetStore();
  const budget = useBudgetStore(selectActiveBudget);
  const t = useStrings();
  if (!budget) return null;

  return (
    <div className="mt-8">
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {t["section.intro"]}
      </h3>
      <div className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">
        <InlineText
          value={budget.intro ?? ""}
          onCommit={(intro) => setMeta({ intro })}
          ariaLabel={t["section.intro"]}
          placeholder={t["section.introPh"]}
          multiline
          navId="meta:intro"
        />
      </div>
    </div>
  );
}
