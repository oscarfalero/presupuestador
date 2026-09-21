"use client";

import dynamic from "next/dynamic";

// The editor is fully interactive and client-state driven (zustand +
// dnd-kit generate IDs at runtime), so it must not be server-rendered:
// SSR HTML would carry different IDs than the client hydration pass,
// causing hydration mismatches (dnd-kit `DndDescribedBy-*` attributes).
const BudgetEditor = dynamic(
  () => import("./BudgetEditor").then((m) => m.BudgetEditor),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-sm text-zinc-500">Loading editor…</p>
      </div>
    ),
  },
);

export function BudgetEditorLoader() {
  return <BudgetEditor />;
}
