"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Warning2 } from "@/lib/icons";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary" | "warning";
  requireReason?: boolean;
  reasonPlaceholder?: string;
  requireConsentCheckbox?: boolean;
  consentCheckboxLabel?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "danger",
  requireReason = false,
  reasonPlaceholder = "Tuliskan alasan...",
  requireConsentCheckbox = false,
  consentCheckboxLabel = "Saya memahami konsekuensi tindakan ini",
  isLoading = false,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => {
        setReason("");
        setConsentChecked(false);
      });
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const isConfirmDisabled =
    isLoading ||
    (requireReason && !reason.trim()) ||
    (requireConsentCheckbox && !consentChecked);

  const buttonColors = {
    danger: "bg-danger-600 hover:bg-danger-700 text-white",
    primary: "bg-lavender-600 hover:bg-lavender-700 text-white",
    warning: "bg-warning-600 hover:bg-warning-700 text-white",
  }[variant];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => !isLoading && onClose()}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-neutral-200/90 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
              variant === "danger"
                ? "bg-danger-50 text-danger-600"
                : variant === "warning"
                ? "bg-warning-50 text-warning-600"
                : "bg-lavender-50 text-lavender-600"
            )}
          >
            <Warning2 size={20} />
          </div>

          <div>
            <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Reason Textarea */}
        {requireReason && (
          <div className="mt-1">
            <label className="text-[11px] font-medium text-neutral-600 block mb-1">
              Alasan Tindakan <span className="text-danger-600">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              className="w-full text-xs p-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300 resize-none"
            />
          </div>
        )}

        {/* Consent Checkbox */}
        {requireConsentCheckbox && (
          <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer select-none mt-1">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="w-4 h-4 rounded text-lavender-600 focus:ring-lavender-300 border-neutral-300"
            />
            <span>{consentCheckboxLabel}</span>
          </label>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-neutral-100">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={isConfirmDisabled}
            onClick={() => onConfirm(reason)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50",
              buttonColors
            )}
          >
            {isLoading ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
