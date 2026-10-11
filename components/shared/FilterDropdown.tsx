"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ArrowDown2, TickCircle } from "@/lib/icons";

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
}

interface FilterDropdownProps<T extends string = string> {
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  menuWidth?: string;
}

export function FilterDropdown<T extends string = string>({
  value,
  options,
  onChange,
  className,
  menuWidth = "min-w-[180px]",
}: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const currentOption = options.find((o) => o.value === value) || options[0];
  const isFiltered = value !== "all";

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-2xs select-none",
          isFiltered
            ? "border-lavender-300 bg-lavender-50/70 text-lavender-900 font-semibold ring-1 ring-lavender-200"
            : "border-neutral-200/90 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300",
          open && "ring-2 ring-lavender-300 border-lavender-400 bg-white",
          className
        )}
      >
        <span>{currentOption?.label || value}</span>
        <ArrowDown2
          size={12}
          className={cn(
            "text-neutral-400 transition-transform duration-200 shrink-0",
            open && "rotate-180 text-lavender-600",
            isFiltered && "text-lavender-700"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-full mt-1.5 max-h-64 overflow-y-auto bg-white rounded-xl shadow-xl border border-neutral-200/90 p-1 z-40 animate-in fade-in zoom-in-95 duration-100",
            menuWidth
          )}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors",
                  isSelected
                    ? "bg-lavender-100 text-lavender-950 font-semibold"
                    : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                )}
              >
                <span>{opt.label}</span>
                {isSelected && <TickCircle size={14} className="text-lavender-600 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
