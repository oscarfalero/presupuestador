"use client";

import { useEffect, useRef, useState } from "react";
import { UNITS, type UnitOfMeasure } from "@/lib/budget-types";
import { fmt } from "@/lib/i18n";
import { useStrings } from "@/lib/locale";

const displayCls =
  "w-full cursor-text rounded px-1 py-0.5 text-left hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-zinc-400 dark:hover:bg-zinc-800";
const inputCls =
  "w-full rounded border border-zinc-400 bg-white px-1 py-0.5 outline-none focus:border-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:focus:border-zinc-300";

/**
 * Spreadsheet-like keyboard navigation.
 *
 * Every editable field carries a `data-nav-id` in DOM order. Tab commits
 * the current cell and opens the next one already in edit mode
 * (Shift+Tab goes backwards). Display buttons also enter edit mode when
 * they receive keyboard focus, so plain Tab walks the grid editing.
 */
const ENTER_EDIT_EVENT = "presupuestador:enter-edit";

export function moveEditFocus(currentNavId: string, direction: 1 | -1): boolean {
  if (typeof document === "undefined" || !currentNavId) return false;
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-id]"));
  const idx = els.findIndex((el) => el.dataset.navId === currentNavId);
  const target = idx >= 0 ? els[idx + direction] : undefined;
  const id = target?.dataset.navId;
  if (!target || !id) return false;
  window.dispatchEvent(new CustomEvent<string>(ENTER_EDIT_EVENT, { detail: id }));
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    target.focus();
  }
  return true;
}

function useEnterEditSignal(navId: string | undefined, editing: boolean, onEnter: () => void) {
  const onEnterRef = useRef<() => void>(() => {});
  useEffect(() => {
    onEnterRef.current = onEnter;
  });
  useEffect(() => {
    if (!navId || editing) return;
    const handler = (e: Event) => {
      if ((e as CustomEvent<string>).detail === navId) onEnterRef.current();
    };
    window.addEventListener(ENTER_EDIT_EVENT, handler);
    return () => window.removeEventListener(ENTER_EDIT_EVENT, handler);
  }, [navId, editing]);
}

interface NavProps {
  /** Unique id locating this field in the Tab order. */
  navId?: string;
}

function useDisplayButton(navId: string | undefined, editing: boolean, startEdit: () => void) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const suppressRef = useRef(false);
  /** Return focus to the cell after keyboard commit, without reopening it. */
  const refocus = () => {
    suppressRef.current = true;
    btnRef.current?.focus({ preventScroll: true });
  };
  const onFocus = () => {
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    startEdit();
  };
  useEnterEditSignal(navId, editing, startEdit);
  return { btnRef, refocus, onFocus };
}

interface InlineTextProps extends NavProps {
  value: string;
  onCommit: (next: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  /** Overrides the default hover tooltip. */
  title?: string;
  /** Multiline display + textarea editing (preserves line breaks). */
  multiline?: boolean;
  /** When true, empty commits are ignored (field is required). */
  required?: boolean;
  /** When true, enters edit mode on mount (e.g. freshly added rows). */
  autoEdit?: boolean;
}

/**
 * Click-to-edit text field. Enter/blur commits, Esc cancels,
 * Tab commits and opens the next field editing.
 */
export function InlineText({
  value,
  onCommit,
  ariaLabel,
  placeholder,
  className,
  title,
  required,
  autoEdit,
  navId,
  multiline,
}: InlineTextProps) {
  const t = useStrings();
  const [editing, setEditing] = useState(!!autoEdit);
  const [draft, setDraft] = useState(value);
  // Guards against a blur-commit racing the unmount triggered by Esc.
  const cancelRef = useRef(false);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const { btnRef, refocus, onFocus } = useDisplayButton(navId, editing, startEdit);

  const refocusIfKeyboard = () => {
    if (typeof document !== "undefined" && document.activeElement === document.body) refocus();
  };

  const commit = (next: string) => {
    const cancelled = cancelRef.current;
    cancelRef.current = false;
    setEditing(false);
    if (cancelled) return;
    if (next === value) {
      refocusIfKeyboard();
      return;
    }
    if (required && next.trim() === "") return;
    onCommit(next);
    refocusIfKeyboard();
  };

  const handleTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !navId) return;
    e.preventDefault();
    const draftValue = (e.target as HTMLInputElement).value;
    // Order matters: resolve the target while this input is still mounted.
    const moved = moveEditFocus(navId, e.shiftKey ? -1 : 1);
    commit(draftValue);
    if (!moved) refocus();
  };

  if (!editing) {
    return (
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        title={title ?? t["field.clickToEdit"]}
        data-nav-id={navId}
        onClick={startEdit}
        onFocus={onFocus}
        className={`${displayCls} ${multiline ? "whitespace-pre-wrap break-words" : ""} ${className ?? ""}`}
      >
        {value ? (
          value
        ) : (
          <span className="text-zinc-400 italic dark:text-zinc-500">{placeholder ?? t["field.clickToEditPlaceholder"]}</span>
        )}
      </button>
    );
  }

  if (multiline) {
    return (
      <textarea
        autoFocus
        value={draft}
        data-nav-id={navId}
        rows={Math.min(2 + draft.split("\n").length, 8)}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            cancelRef.current = true;
            setEditing(false);
          } else if (e.key === "Tab") handleTab(e);
        }}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={`${inputCls} resize-y ${className ?? ""}`}
      />
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      data-nav-id={navId}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => commit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        else if (e.key === "Escape") {
          cancelRef.current = true;
          setEditing(false);
        } else if (e.key === "Tab") handleTab(e);
      }}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={`${inputCls} ${className ?? ""}`}
    />
  );
}

interface InlineNumberProps extends NavProps {
  value: number;
  onCommit: (next: number) => void;
  ariaLabel: string;
  min?: number;
  step?: string;
  format?: (n: number) => string;
  className?: string;
  title?: string;
}

/**
 * Click-to-edit numeric field. Rejects NaN and values below `min`
 * with an inline hint and keeps the editor open; Esc cancels.
 * Accepts comma as decimal separator. Tab commits and advances.
 */
export function InlineNumber({
  value,
  onCommit,
  ariaLabel,
  min = 0,
  step = "any",
  format,
  className,
  title,
  navId,
}: InlineNumberProps) {
  const t = useStrings();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Guards against a blur-commit racing the unmount triggered by Esc.
  const cancelRef = useRef(false);

  const startEdit = () => {
    setDraft(String(value));
    setError(null);
    setEditing(true);
  };

  const { btnRef, refocus, onFocus } = useDisplayButton(navId, editing, startEdit);

  const refocusIfKeyboard = () => {
    if (typeof document !== "undefined" && document.activeElement === document.body) refocus();
  };

  /** Returns false when the value is invalid (editor stays open). */
  const commit = (raw: string): boolean => {
    const cancelled = cancelRef.current;
    cancelRef.current = false;
    if (cancelled) {
      setError(null);
      setEditing(false);
      return true;
    }
    const parsed = Number(raw.replace(",", "."));
    if (raw.trim() === "" || !Number.isFinite(parsed)) {
      setError(t["field.invalidNumber"]);
      inputRef.current?.focus();
      return false;
    }
    if (parsed < min) {
      setError(fmt(t["field.minNumber"], { n: min }));
      inputRef.current?.focus();
      return false;
    }
    setError(null);
    setEditing(false);
    if (parsed !== value) onCommit(parsed);
    refocusIfKeyboard();
    return true;
  };

  const handleTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !navId) return;
    e.preventDefault();
    const draftValue = (e.target as HTMLInputElement).value;
    // Validate first: an invalid value keeps the editor open.
    const parsed = Number(draftValue.replace(",", "."));
    if (draftValue.trim() === "" || !Number.isFinite(parsed) || parsed < min) {
      commit(draftValue);
      return;
    }
    moveEditFocus(navId, e.shiftKey ? -1 : 1);
    commit(draftValue);
  };

  if (!editing) {
    return (
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        title={title ?? t["field.clickToEdit"]}
        data-nav-id={navId}
        onClick={startEdit}
        onFocus={onFocus}
        className={`${displayCls} text-right tabular-nums ${className ?? ""}`}
      >
        {format ? format(value) : String(value)}
      </button>
    );
  }

  return (
    <span className="block">
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        data-nav-id={navId}
        inputMode="decimal"
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onFocus={(e) => e.target.select()}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          else if (e.key === "Escape") {
            cancelRef.current = true;
            setError(null);
            setEditing(false);
          } else if (e.key === "Tab") handleTab(e);
        }}
        aria-label={ariaLabel}
        aria-invalid={error !== null}
        step={step}
        title={title}
        className={`${inputCls} text-right tabular-nums ${error ? "border-red-500" : ""} ${className ?? ""}`}
      />
      {error ? (
        <span role="alert" className="mt-0.5 block text-right text-xs text-red-600 dark:text-red-400">
          {error} {t["field.escToCancel"]}
        </span>
      ) : null}
    </span>
  );
}

interface InlineUnitProps extends NavProps {
  value: UnitOfMeasure;
  onCommit: (next: UnitOfMeasure) => void;
  ariaLabel: string;
}

/** Unit selector styled as plain text until hovered/focused. */
export function InlineUnit({ value, onCommit, ariaLabel, navId }: InlineUnitProps) {
  const t = useStrings();
  return (
    <select
      value={value}
      data-nav-id={navId}
      onChange={(e) => {
        const next = e.target.value as UnitOfMeasure;
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Tab" && navId && moveEditFocus(navId, e.shiftKey ? -1 : 1)) {
          e.preventDefault();
        }
      }}
      aria-label={ariaLabel}
      title={t["field.unit"]}
      className="cursor-pointer appearance-none rounded border border-transparent bg-transparent px-1 py-0.5 text-center hover:bg-zinc-100 focus:border-zinc-400 focus:bg-white focus:outline-2 focus:outline-zinc-400 dark:hover:bg-zinc-800 dark:focus:border-zinc-600 dark:focus:bg-zinc-900 dark:[&>option]:bg-zinc-900"
    >
      {UNITS.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}
