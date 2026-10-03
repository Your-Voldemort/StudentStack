"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: "/", description: "Focus search" },
  { keys: "F", description: "Open filters" },
  { keys: "C", description: "Clear all filters" },
  { keys: "← →", description: "Move between offers" },
  { keys: "Enter", description: "Open the focused offer" },
  { keys: "Esc", description: "Clear search / close dialogs" },
  { keys: "?", description: "Show this help" },
];

export function ShortcutsHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <ul className="space-y-2.5">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{s.description}</span>
              <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
