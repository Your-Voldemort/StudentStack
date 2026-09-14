"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilterPanel } from "./filter-panel";
import type { ComponentProps } from "react";

export function MobileFilterSheet({
  open,
  onOpenChange,
  resultCount,
  ...filterPanelProps
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resultCount: number;
} & ComponentProps<typeof FilterPanel>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Bottom-sheet positioning: override DialogContent's centered
          fixed/translate classes with a bottom-anchored, full-width,
          scrollable panel instead of introducing a drawer dependency. */}
      <DialogContent className="top-auto bottom-0 left-0 max-h-[85vh] w-full max-w-full translate-x-0 translate-y-0 overflow-y-auto rounded-t-xl rounded-b-none sm:max-w-full">
        <DialogTitle>Filters</DialogTitle>
        <FilterPanel {...filterPanelProps} />
        <div className="bg-background sticky bottom-0 -mx-4 -mb-4 border-t px-4 py-3">
          <Button className="min-h-11 w-full" onClick={() => onOpenChange(false)}>
            Show {resultCount} results
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
