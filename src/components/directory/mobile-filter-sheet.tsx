"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="top-auto bottom-0 left-0 max-h-[88vh] w-full max-w-full translate-x-0 translate-y-0 overflow-y-auto rounded-t-2xl rounded-b-none border-t border-[rgba(255,255,255,0.12)] bg-[#121215] p-5 text-[#f4f4f5] shadow-2xl sm:max-w-full">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/25" aria-hidden />
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
          <DialogTitle className="text-base font-bold tracking-tight text-[#f4f4f5]">
            Filters
          </DialogTitle>
          <span className="text-xs text-[#8e8e99] font-medium">
            {resultCount} matching
          </span>
        </div>
        <div className="py-2">
          <FilterPanel {...filterPanelProps} />
        </div>
        <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-[rgba(255,255,255,0.08)] bg-[#121215]/95 p-4 backdrop-blur-md">
          <button
            type="button"
            className="w-full min-h-[44px] rounded-xl bg-[#d8b4fe] text-[#1e0d38] font-bold text-sm transition-colors hover:bg-[#c084fc] flex items-center justify-center cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Show {resultCount} offers
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
