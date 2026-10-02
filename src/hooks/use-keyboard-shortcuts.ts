import { useEffect } from "react";

/**
 * Register global keyboard shortcuts.
 *
 * Shortcuts are ignored while the user is typing in an input, textarea,
 * select, or content-editable element, so they never hijack text entry.
 * Each action receives the keyboard event and decides itself whether to
 * call `preventDefault()`.
 */
export function useKeyboardShortcuts(actions: Record<string, (e: KeyboardEvent) => void>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }
      const action = actions[e.key.toLowerCase()];
      if (action) {
        action(e);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions]);
}
