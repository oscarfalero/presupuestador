import { useEffect, useRef } from "react";

/**
 * Spreadsheet-like keyboard navigation (single focus mechanism for the
 * whole editor).
 *
 * Every editable field carries a `data-nav-id` in DOM order. Tab commits
 * the current cell and opens the next one already in edit mode
 * (Shift+Tab goes backwards). Display buttons also enter edit mode when
 * they receive keyboard focus, so plain Tab walks the grid editing.
 * Adding a row focuses it through the same signal instead of a
 * prop drilled three levels down (which also avoids copying a prop into
 * state and going stale).
 */
const ENTER_EDIT_EVENT = "presupuestador:enter-edit";

/** Ask the field with this nav id to enter edit mode (no-op if absent). */
export function requestEditFocus(navId: string): void {
  if (typeof window === "undefined" || !navId) return;
  window.dispatchEvent(new CustomEvent<string>(ENTER_EDIT_EVENT, { detail: navId }));
}

export function moveEditFocus(currentNavId: string, direction: 1 | -1): boolean {
  if (typeof document === "undefined" || !currentNavId) return false;
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-id]"));
  const idx = els.findIndex((el) => el.dataset.navId === currentNavId);
  const target = idx >= 0 ? els[idx + direction] : undefined;
  const id = target?.dataset.navId;
  if (!target || !id) return false;
  requestEditFocus(id);
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    target.focus();
  }
  return true;
}

export function useEnterEditSignal(
  navId: string | undefined,
  editing: boolean,
  onEnter: () => void,
): void {
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
