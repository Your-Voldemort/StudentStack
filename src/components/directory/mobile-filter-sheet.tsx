"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FilterPanel } from "./filter-panel";
import type { ComponentProps } from "react";

export function MobileFilterSheet({
  open,
  onOpenChange,
  resultCount,
  onClearAll,
  ...filterPanelProps
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resultCount: number;
  onClearAll?: () => void;
} & ComponentProps<typeof FilterPanel>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-auto bottom-0 left-0 flex flex-col max-h-[88vh] h-[88vh] w-full max-w-full translate-x-0 translate-y-0 overflow-hidden rounded-t-3xl rounded-b-none border-t border-[rgba(255,255,255,0.14)] bg-[#121215] p-0 text-[#f4f4f5] shadow-2xl sm:max-w-full font-sans">
        <div className="flex-none px-5 pt-3 pb-3 border-b border-[rgba(255,255,255,0.08)] bg-[#121215]">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" aria-hidden />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DialogTitle className="text-base font-bold tracking-tight text-[#f4f4f5]">
                Filters
              </DialogTitle>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-[#a1a1aa] font-semibold">
                {resultCount} offers
              </span>
            </div>
            {onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs text-[#a1a1aa] hover:text-[#f4f4f5] font-semibold underline cursor-pointer p-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 overscroll-contain">
          <FilterPanel {...filterPanelProps} />
        </div>

        <div className="flex-none border-t border-[rgba(255,255,255,0.1)] bg-[#121215] p-4 z-20">
          <button
            type="button"
            className="w-full min-h-[48px] rounded-full bg-[#ff9a00] text-[#111418] font-bold text-sm transition-all hover:bg-[#e68a00] flex items-center justify-center cursor-pointer shadow-lg active:scale-[0.98]"
            onClick={() => onOpenChange(false)}
          >
            Show {resultCount} offers
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
