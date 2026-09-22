"use client";

import { useStrings } from "@/lib/locale";
import { InlineText } from "./inline-fields";

interface DocSectionProps {
  title: string;
  value: string;
  placeholder: string;
  navId: string;
  onChange: (next: string) => void;
}

/** Optional free-text document block (intro, terms, payment). */
export function DocSection({ title, value, placeholder, navId, onChange }: DocSectionProps) {
  const t = useStrings();
  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {title}
        </h2>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="cursor-pointer rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            {t["section.remove"]}
          </button>
        ) : null}
      </div>
      <div className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">
        <InlineText
          value={value}
          onCommit={onChange}
          ariaLabel={title}
          placeholder={placeholder}
          multiline
          navId={navId}
        />
      </div>
    </section>
  );
}
