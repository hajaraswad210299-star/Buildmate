"use client";

import React, { useState } from "react";
import { Lock, Eye, EyeSlash, Warning2, TickCircle } from "@/lib/icons";

interface PasswordFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showStrength?: boolean;
}

export function PasswordField({
  label = "Password",
  error,
  showStrength = false,
  value,
  onChange,
  ...props
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState("CapsLock"));
  };

  const strValue = typeof value === "string" ? value : "";

  // Password strength checklist (B11.3)
  const hasMinLength = strValue.length >= 8;
  const hasUpperCase = /[A-Z]/.test(strValue);
  const hasLowerCase = /[a-z]/.test(strValue);
  const hasNumber = /[0-9]/.test(strValue);

  const criteriaCount = [hasMinLength, hasUpperCase, hasLowerCase, hasNumber].filter(
    Boolean
  ).length;

  return (
    <div className="space-y-1.5 text-left">
      {label && (
        <label className="block text-xs font-semibold text-neutral-700">
          {label}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
          <Lock size={18} />
        </div>

        <input
          {...props}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          onKeyUp={handleKeyUp}
          className={`w-full h-12 pl-10 pr-11 rounded-xl bg-white border text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all ${
            error
              ? "border-danger-500 focus:border-danger-600 focus:ring-4 focus:ring-danger-100"
              : "border-neutral-200 hover:border-neutral-300 focus:border-lavender-600 focus:ring-4 focus:ring-lavender-100"
          }`}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 transition-colors"
          aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
        >
          {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {capsLock && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium pt-0.5 animate-in fade-in">
          <Warning2 size={13} />
          <span>Caps Lock aktif</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-danger-700 font-medium pt-0.5 animate-in fade-in">
          <Warning2 size={13} />
          <span>{error}</span>
        </div>
      )}

      {/* 4-Segment Strength Indicator & Checklist (C02b) */}
      {showStrength && strValue.length > 0 && (
        <div className="pt-2 space-y-2 animate-in fade-in duration-200">
          {/* Segments */}
          <div className="grid grid-cols-4 gap-1.5 h-1.5">
            {[1, 2, 3, 4].map((seg) => (
              <div
                key={seg}
                className={`rounded-full transition-colors duration-300 ${
                  criteriaCount >= seg
                    ? criteriaCount <= 2
                      ? "bg-amber-500"
                      : criteriaCount === 3
                      ? "bg-blue-500"
                      : "bg-emerald-500"
                    : "bg-neutral-200"
                }`}
              />
            ))}
          </div>

          {/* Checklist */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
            <div
              className={`flex items-center gap-1.5 ${
                hasMinLength ? "text-emerald-700 font-medium" : "text-neutral-400"
              }`}
            >
              <TickCircle
                size={13}
                variant={hasMinLength ? "Bold" : "Linear"}
                className={hasMinLength ? "text-emerald-600" : "text-neutral-300"}
              />
              <span>Min. 8 karakter</span>
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                hasUpperCase ? "text-emerald-700 font-medium" : "text-neutral-400"
              }`}
            >
              <TickCircle
                size={13}
                variant={hasUpperCase ? "Bold" : "Linear"}
                className={hasUpperCase ? "text-emerald-600" : "text-neutral-300"}
              />
              <span>Huruf besar (A-Z)</span>
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                hasLowerCase ? "text-emerald-700 font-medium" : "text-neutral-400"
              }`}
            >
              <TickCircle
                size={13}
                variant={hasLowerCase ? "Bold" : "Linear"}
                className={hasLowerCase ? "text-emerald-600" : "text-neutral-300"}
              />
              <span>Huruf kecil (a-z)</span>
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                hasNumber ? "text-emerald-700 font-medium" : "text-neutral-400"
              }`}
            >
              <TickCircle
                size={13}
                variant={hasNumber ? "Bold" : "Linear"}
                className={hasNumber ? "text-emerald-600" : "text-neutral-300"}
              />
              <span>Angka (0-9)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
