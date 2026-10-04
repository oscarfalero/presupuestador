"use client";

import dynamic from "next/dynamic";
import { useStrings } from "@/lib/locale";

// Same client-only rationale as the editor: the list renders persisted
// budgets, so SSR HTML could mismatch the hydrated state.
const BudgetsPage = dynamic(() => import("./BudgetsPage").then((m) => m.BudgetsPage), {
  ssr: false,
  loading: () => <LoadingFallback />,
});

function LoadingFallback() {
  const t = useStrings();
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t["loading.editor"]}</p>
    </div>
  );
}

export function BudgetsLoader() {
  return <BudgetsPage />;
}
