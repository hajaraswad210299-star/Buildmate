"use client";

import React from "react";
import { Warning2 } from "@/lib/icons";

interface PhoneFieldProps {
  label?: string;
  value: string;
  onChange: (normalizedValue: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
}

export function PhoneField({
  label = "Nomor WhatsApp",
  value,
  onChange,
  error,
  placeholder = "812 3456 7890",
  required = false,
}: PhoneFieldProps) {
  // Extract digits only for display without prefix
  const getDisplayValue = (raw: string) => {
    if (!raw) return "";
    let clean = raw.replace(/\D/g, "");
    if (clean.startsWith("62")) {
      clean = clean.slice(2);
    } else if (clean.startsWith("0")) {
      clean = clean.slice(1);
    }
    return clean;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputDigits = e.target.value.replace(/\D/g, "");
    let normalized = inputDigits;

    // Normalize to 628...
    if (inputDigits.startsWith("0")) {
      normalized = "62" + inputDigits.slice(1);
    } else if (inputDigits.startsWith("62")) {
      normalized = inputDigits;
    } else if (inputDigits.length > 0) {
      normalized = "62" + inputDigits;
    } else {
      normalized = "";
    }

    onChange(normalized);
  };

  const display = getDisplayValue(value);

  return (
    <div className="space-y-1.5 text-left">
      {label && (
        <label className="block text-xs font-semibold text-neutral-700">
          {label} {required && <span className="text-danger-600">*</span>}
        </label>
      )}

      <div className="relative flex rounded-xl border overflow-hidden transition-all bg-white shadow-xs focus-within:border-lavender-600 focus-within:ring-4 focus-within:ring-lavender-100 border-neutral-200 hover:border-neutral-300">
        <div className="flex items-center gap-1 px-3.5 bg-neutral-50 border-r border-neutral-200 text-neutral-700 text-xs font-bold select-none shrink-0">
          <span>🇮🇩</span>
          <span>+62</span>
        </div>

        <input
          type="tel"
          value={display}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full h-12 px-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
        />
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-danger-700 font-medium pt-0.5 animate-in fade-in">
          <Warning2 size={13} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
