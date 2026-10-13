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
  fullWidth?: boolean;
  size?: "sm" | "md";
  placeholder?: string;
  disabled?: boolean;
  align?: "left" | "right";
}

export function FilterDropdown<T extends string = string>({
  value,
  options,
  onChange,
  className,
  menuWidth,
  fullWidth = false,
  size = "sm",
  placeholder = "Pilih opsi...",
  disabled = false,
  align = "left",
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

  const currentOption = options.find((o) => o.value === value);
  const displayLabel = currentOption ? currentOption.label : placeholder;
  const isFiltered = !fullWidth && value !== "all" && value !== "";

  const sizeClasses =
    size === "md"
      ? "py-2.5 px-3 text-xs rounded-xl"
      : "py-1.5 px-3 text-xs rounded-xl";

  return (
    <div
      ref={containerRef}
      className={cn("relative text-left", fullWidth ? "w-full block" : "inline-block")}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "border font-medium transition-all shadow-2xs select-none",
          sizeClasses,
          fullWidth
            ? "w-full flex items-center justify-between bg-white text-neutral-800 hover:border-neutral-300 border-neutral-200"
            : "inline-flex items-center gap-1.5",
          !fullWidth &&
            (isFiltered
              ? "border-lavender-300 bg-lavender-50/70 text-lavender-900 font-semibold ring-1 ring-lavender-200"
              : "border-neutral-200/90 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300"),
          open && "ring-2 ring-lavender-300 border-lavender-400 bg-white",
          disabled && "opacity-50 cursor-not-allowed bg-neutral-100",
          className
        )}
      >
        <span className={cn("truncate", !currentOption && "text-neutral-400 font-normal")}>
          {displayLabel}
        </span>
        <ArrowDown2
          size={14}
          className={cn(
            "text-neutral-400 transition-transform duration-200 shrink-0 ml-2",
            open && "rotate-180 text-lavender-600",
            isFiltered && "text-lavender-700"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full mt-1.5 max-h-64 overflow-y-auto bg-white rounded-xl shadow-xl border border-neutral-200/90 p-1 z-50 animate-in fade-in zoom-in-95 duration-100",
            align === "right" ? "right-0" : "left-0",
            fullWidth ? "w-full" : menuWidth || "min-w-[180px]"
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
                  "w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors",
                  isSelected
                    ? "bg-lavender-100 text-lavender-950 font-semibold"
                    : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <TickCircle size={14} className="text-lavender-600 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
