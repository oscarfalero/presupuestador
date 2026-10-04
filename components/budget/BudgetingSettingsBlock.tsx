"use client";

import { useCompanyStore } from "@/lib/company";
import { useStrings } from "@/lib/locale";
import { InlineText } from "./inline-fields";

/**
 * Company-scoped budgeting parameters: predefined hour value and
 * instructions. Always visible under Preferences and stored so the
 * budget tool / AI can read them later; never exported to client
 * documents.
 */
export function BudgetingSettingsBlock() {
  const profile = useCompanyStore((s) => s.profile);
  const updateProfile = useCompanyStore((s) => s.updateProfile);
  const t = useStrings();

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2 bg-zinc-50 px-4 py-2 dark:bg-zinc-900">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {t["settings.title"]}
        </span>
      </div>
      <div className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {t["settings.hourlyRate"]}
          </p>
          <div className="rounded-xl border border-zinc-200 px-4 py-2 dark:border-zinc-700">
            <InlineText
              value={profile.hourlyRate ?? ""}
              onCommit={(hourlyRate) => updateProfile({ hourlyRate })}
              ariaLabel={t["settings.hourlyRate"]}
              placeholder={t["settings.hourlyRatePh"]}
              multiline
              navId="company:hourlyRate"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {t["settings.instructions"]}
          </p>
          <div className="rounded-xl border border-zinc-200 px-4 py-2 dark:border-zinc-700">
            <InlineText
              value={profile.instructions ?? ""}
              onCommit={(instructions) => updateProfile({ instructions })}
              ariaLabel={t["settings.instructions"]}
              placeholder={t["settings.instructionsPh"]}
              multiline
              navId="company:instructions"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
