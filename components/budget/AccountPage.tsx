"use client";

import Link from "next/link";
import { LocaleToggle } from "@/components/LocaleToggle";
import { useStrings } from "@/lib/locale";
import { BudgetingSettingsBlock } from "./BudgetingSettingsBlock";
import { CompanyBlock } from "./CompanyBlock";

export type AccountSection = "account" | "preferences";

/**
 * Settings shell: left sidebar navigating between the account sections
 * plus the section content. Company data and budgeting settings live
 * here instead of in the budgets index or the editor.
 */
export function AccountPage({ section }: { section: AccountSection }) {
  const t = useStrings();
  const items: { section: AccountSection; href: string; label: string }[] = [
    { section: "account", href: "/account", label: t["account.title"] },
    { section: "preferences", href: "/account/preferences", label: t["account.preferences"] },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← {t["budgets.title"]}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">{t["account.title"]}</h1>
      <div className="mt-6 flex flex-col gap-6 md:flex-row">
        <nav aria-label={t["account.title"]} className="flex shrink-0 gap-2 md:w-52 md:flex-col">
          {items.map((item) => {
            const active = item.section === section;
            return (
              <Link
                key={item.section}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium md:flex-none ${
                  active
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1">
          {section === "account" ? (
            <>
              <CompanyBlock />
              <section className="mb-6 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <h2 className="mb-2 text-sm font-semibold">{t["locale.label"]}</h2>
                <LocaleToggle />
              </section>
            </>
          ) : (
            <BudgetingSettingsBlock />
          )}
        </div>
      </div>
    </div>
  );
}
