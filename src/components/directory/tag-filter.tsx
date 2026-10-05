"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function TagFilter({
  allTags,
  selected,
  onChange,
}: {
  allTags: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(tag: string) {
    onChange(
      selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag],
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls="tag-filter-list"
          className="flex w-full min-h-[38px] items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-[#f4f4f5] hover:border-white/30 hover:bg-white/10 transition-colors sm:w-44 outline-none cursor-pointer"
        >
          <span className="truncate">
            {selected.length ? `${selected.length} tag(s) selected` : "Filter by tag..."}
          </span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0 border border-white/15 bg-[#141418] text-[#f4f4f5] shadow-2xl rounded-xl font-sans">
        <Command className="bg-transparent text-[#f4f4f5]">
          <CommandInput placeholder="Search tags..." className="text-xs text-[#f4f4f5] placeholder:text-[#71717a]" />
          <CommandList
            id="tag-filter-list"
            className="max-h-60 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-[#c084fc]/70"
          >
            <CommandEmpty className="py-3 text-center text-xs text-[#71717a]">No tag found.</CommandEmpty>
            <CommandGroup>
              {allTags.map((tag) => (
                <CommandItem
                  key={tag}
                  value={tag}
                  onSelect={() => toggle(tag)}
                  className="flex items-center px-2 py-1.5 text-xs text-[#d4d4d8] hover:bg-white/10 hover:text-white cursor-pointer rounded-lg aria-selected:bg-white/10 aria-selected:text-white"
                >
                  <Check
                    className={cn(
                      "mr-2 size-3.5 text-[#c084fc]",
                      selected.includes(tag) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span>{tag}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
