"use client";

import { useRef, useState } from "react";
import { UNITS, type UnitOfMeasure } from "@/lib/budget-types";

const displayCls =
  "w-full rounded px-1 py-0.5 text-left hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-zinc-400";
const inputCls =
  "w-full rounded border border-zinc-400 bg-white px-1 py-0.5 outline-none focus:border-zinc-900";

interface InlineTextProps {
  value: string;
  onCommit: (next: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  /** When true, empty commits are ignored (field is required). */
  required?: boolean;
  /** When true, enters edit mode on mount (e.g. freshly added rows). */
  autoEdit?: boolean;
}

/**
 * Click-to-edit text field. Enter/blur commits, Esc cancels.
 */
export function InlineText({
  value,
  onCommit,
  ariaLabel,
  placeholder,
  className,
  required,
  autoEdit,
}: InlineTextProps) {
  const [editing, setEditing] = useState(!!autoEdit);
  const [draft, setDraft] = useState(value);
  // Guards against a blur-commit racing the unmount triggered by Esc.
  const cancelRef = useRef(false);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const commit = (next: string) => {
    const cancelled = cancelRef.current;
    cancelRef.current = false;
    setEditing(false);
    if (cancelled) return;
    if (next === value) return;
    if (required && next.trim() === "") return;
    onCommit(next);
  };

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        title="Click to edit"
        onClick={startEdit}
        className={`${displayCls} ${className ?? ""}`}
      >
        {value ? (
          value
        ) : (
          <span className="text-zinc-400 italic">{placeholder ?? "Click to edit…"}</span>
        )}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => commit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          cancelRef.current = true;
          setEditing(false);
        }
      }}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={`${inputCls} ${className ?? ""}`}
    />
  );
}

interface InlineNumberProps {
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
 * Accepts comma as decimal separator.
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
}: InlineNumberProps) {
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

  const commit = (raw: string) => {
    const cancelled = cancelRef.current;
    cancelRef.current = false;
    if (cancelled) {
      setError(null);
      setEditing(false);
      return;
    }
    const parsed = Number(raw.replace(",", "."));
    if (raw.trim() === "" || !Number.isFinite(parsed)) {
      setError("Enter a valid number");
      inputRef.current?.focus();
      return;
    }
    if (parsed < min) {
      setError(`Must be ≥ ${min}`);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setEditing(false);
    if (parsed !== value) onCommit(parsed);
  };

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        title={title ?? "Click to edit"}
        onClick={startEdit}
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
        inputMode="decimal"
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onFocus={(e) => e.target.select()}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            cancelRef.current = true;
            setError(null);
            setEditing(false);
          }
        }}
        aria-label={ariaLabel}
        aria-invalid={error !== null}
        step={step}
        title={title}
        className={`${inputCls} text-right tabular-nums ${error ? "border-red-500" : ""} ${className ?? ""}`}
      />
      {error ? (
        <span role="alert" className="mt-0.5 block text-right text-xs text-red-600">
          {error} — Esc to cancel
        </span>
      ) : null}
    </span>
  );
}

interface InlineUnitProps {
  value: UnitOfMeasure;
  onCommit: (next: UnitOfMeasure) => void;
  ariaLabel: string;
}

/** Unit selector styled as plain text until hovered/focused. */
export function InlineUnit({ value, onCommit, ariaLabel }: InlineUnitProps) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const next = e.target.value as UnitOfMeasure;
        if (next !== value) onCommit(next);
      }}
      aria-label={ariaLabel}
      title="Unit of measure"
      className="cursor-pointer appearance-none rounded bg-transparent px-1 py-0.5 text-center hover:bg-zinc-100 focus:bg-white focus:outline-2 focus:outline-zinc-400"
    >
      {UNITS.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}
