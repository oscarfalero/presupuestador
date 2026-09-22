"use client";

import { useState } from "react";

interface ConfirmButtonProps {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  ariaLabel: string;
  title?: string;
  className?: string;
  confirmClassName?: string;
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

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
        className={className ?? ""}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      autoFocus
      onClick={() => {
        setArmed(false);
        onConfirm();
      }}
      onBlur={() => setArmed(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setArmed(false);
      }}
      aria-label={`Confirm: ${ariaLabel}`}
      className={confirmClassName ?? ""}
    >
      {confirmLabel}
    </button>
  );
}
