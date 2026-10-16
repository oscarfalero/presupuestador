"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ConfirmButtonProps {
  label: React.ReactNode;
  confirmLabel: React.ReactNode;
  onConfirm?: () => void;
  /** External URL to open natively in a new tab when confirmed. */
  href?: string;
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

/** Outline diagonal arrow icon (currentColor), immune to mobile emoji substitution. */
export function ArrowUpRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

/**
 * Two-click confirm button (no modals/popups): first click arms it,
 * second click confirms. Outside pointerdown, Tab blur or Esc disarms.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  href,
  ariaLabel,
  title,
  className,
  confirmClassName,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const armedRef = useRef<HTMLElement | null>(null);
  // Move focus onto the freshly mounted confirm control (replaces the
  // static autoFocus attribute; keyboard users confirm from where they are).
  const focusOnMount = useCallback((el: HTMLElement | null) => {
    armedRef.current = el;
    el?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!armed) return;
    const onPointer = (e: PointerEvent) => {
      if (armedRef.current && !armedRef.current.contains(e.target as Node)) {
        setArmed(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setArmed(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [armed]);

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

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) {
      setArmed(false);
    }
  };

  if (href) {
    return (
      <a
        ref={focusOnMount}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          setArmed(false);
          onConfirm?.();
        }}
        onBlur={handleBlur}
        aria-label={`Confirm: ${ariaLabel}`}
        className={`cursor-pointer ${confirmClassName ?? ""}`}
      >
        {confirmLabel}
      </a>
    );
  }

  return (
    <button
      type="button"
      ref={focusOnMount}
      onClick={() => {
        setArmed(false);
        onConfirm?.();
      }}
      onBlur={handleBlur}
      aria-label={`Confirm: ${ariaLabel}`}
      className={`cursor-pointer ${confirmClassName ?? ""}`}
    >
      {confirmLabel}
    </button>
  );
}
