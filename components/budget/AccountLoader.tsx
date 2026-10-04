"use client";

import dynamic from "next/dynamic";
import { useStrings } from "@/lib/locale";
import type { AccountSection } from "./AccountPage";

// Same client-only rationale as the budgets list and the editor: the page
// renders persisted company data, so SSR HTML could mismatch the
// hydrated state.
const AccountPage = dynamic(() => import("./AccountPage").then((m) => m.AccountPage), {
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

export function AccountLoader({ section }: { section: AccountSection }) {
  return <AccountPage section={section} />;
}
