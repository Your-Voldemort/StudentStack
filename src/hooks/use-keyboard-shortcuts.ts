import { useEffect } from "react";

/**
 * Register global keyboard shortcuts.
 *
 * Shortcuts are ignored while the user is typing in an input, textarea,
 * select, or content-editable element (except Escape, which still clears
 * search fields), and while a modal dialog is open (except Escape, which
 * the dialog handles natively). Shortcuts with Ctrl/Cmd/Alt held are
 * never hijacked, so e.g. Ctrl+C still copies.
 * Each action receives the keyboard event and decides itself whether to
 * call `preventDefault()`.
 */
export function useKeyboardShortcuts(actions: Record<string, (e: KeyboardEvent) => void>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const isEscape = e.key === "Escape";
      if (!isEscape && document.querySelector('[role="dialog"]')) return;
      const target = e.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (isTyping && !isEscape) return;
      const action = actions[e.key.toLowerCase()];
      if (action) {
        action(e);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions]);
}
