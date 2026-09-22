"use client";

import dynamic from "next/dynamic";
import { useStrings } from "@/lib/locale";

// The editor is fully interactive and client-state driven (zustand +
// dnd-kit generate IDs at runtime), so it must not be server-rendered:
// SSR HTML would carry different IDs than the client hydration pass,
// causing hydration mismatches (dnd-kit `DndDescribedBy-*` attributes).
const BudgetEditor = dynamic(
  () => import("./BudgetEditor").then((m) => m.BudgetEditor),
  {
    ssr: false,
    loading: () => <LoadingFallback />,
  },
);

function LoadingFallback() {
  const t = useStrings();
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t["loading.editor"]}</p>
    </div>
  );
}

export function BudgetEditorLoader() {
  return <BudgetEditor />;
}
