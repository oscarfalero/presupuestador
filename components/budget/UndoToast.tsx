"use client";

import { useEffect, useState } from "react";
import { useBudgetStore, type DeletedSnapshot } from "@/lib/store";
import { fmt } from "@/lib/i18n";
import { useStrings } from "@/lib/locale";

const UNDO_SECONDS = 5;

/**
 * Timed undo toast for item/chapter deletes. Auto-dismisses after
 * UNDO_SECONDS; Ctrl/Cmd+Z (outside text fields) also undoes.
 */
export function UndoToast() {
  const lastDeleted = useBudgetStore((s) => s.lastDeleted);
  if (!lastDeleted) return null;
  // Keyed by deletion time so the countdown restarts on every delete.
  return <ToastBody key={lastDeleted.at} snapshot={lastDeleted} />;
}

function ToastBody({ snapshot }: { snapshot: DeletedSnapshot }) {
  const undoDelete = useBudgetStore((s) => s.undoDelete);
  const dismissDelete = useBudgetStore((s) => s.dismissDelete);
  const t = useStrings();
  const [secondsLeft, setSecondsLeft] = useState(UNDO_SECONDS);

  useEffect(() => {
    const timeout = setTimeout(dismissDelete, UNDO_SECONDS * 1000);
    const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z" &&
        target &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        e.preventDefault();
        undoDelete();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dismissDelete, undoDelete]);

  const label =
    snapshot.kind === "item"
      ? fmt(t["undo.itemDeleted"], { n: snapshot.item.title })
      : `${fmt(t["undo.chapterDeleted"], { n: snapshot.chapter.title })}${
          snapshot.items.length > 0 ? ` ${fmt(t["undo.withItems"], { n: snapshot.items.length })}` : ""
        }`;

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-zinc-900 py-2 pr-2 pl-4 text-sm text-white shadow-lg dark:bg-white dark:text-zinc-900 max-md:right-3 max-md:bottom-3 max-md:left-3 max-md:translate-x-0 max-md:rounded-2xl max-md:p-3"
    >
      <span className="whitespace-nowrap max-md:min-w-0 max-md:flex-1 max-md:truncate">{label}</span>
      <button
        type="button"
        onClick={() => undoDelete()}
        className="cursor-pointer rounded-full bg-white px-3 py-1 font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-700 max-md:min-h-11 max-md:shrink-0 max-md:px-4 max-md:whitespace-nowrap"
      >
        {t["undo.action"]} ({fmt(t["undo.seconds"], { n: secondsLeft })})
      </button>
      <button
        type="button"
        onClick={() => dismissDelete()}
        aria-label={t["undo.dismiss"]}
        className="cursor-pointer rounded-full px-2 text-zinc-400 hover:text-white dark:text-zinc-500 dark:hover:text-zinc-900 max-md:inline-flex max-md:size-11 max-md:shrink-0 max-md:items-center max-md:justify-center"
      >
        ✕
      </button>
    </div>
  );
}
