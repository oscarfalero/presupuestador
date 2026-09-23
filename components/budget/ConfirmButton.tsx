"use client";

import { useCallback, useState } from "react";

interface ConfirmButtonProps {
  label: React.ReactNode;
  confirmLabel: React.ReactNode;
  onConfirm: () => void;
  ariaLabel: string;
  title?: string;
  className?: string;
  confirmClassName?: string;
}

/** Outline trash icon (currentColor), matching the ThemeToggle icon style. */
export function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

/**
 * Two-click confirm button (no modals/popups): first click arms it,
 * second click confirms. Blur or Esc disarms.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  ariaLabel,
  title,
  className,
  confirmClassName,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  // Move focus onto the freshly mounted confirm button (replaces the
  // static autoFocus attribute; keyboard users confirm from where they are).
  const focusOnMount = useCallback((el: HTMLButtonElement | null) => {
    el?.focus();
  }, []);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
        className={`cursor-pointer ${className ?? ""}`}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      ref={focusOnMount}
      onClick={() => {
        setArmed(false);
        onConfirm();
      }}
      onBlur={() => setArmed(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setArmed(false);
      }}
      aria-label={`Confirm: ${ariaLabel}`}
      className={`cursor-pointer ${confirmClassName ?? ""}`}
    >
      {confirmLabel}
    </button>
  );
}
