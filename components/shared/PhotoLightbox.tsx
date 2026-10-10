"use client";

import React, { useEffect } from "react";
import { CloseCircle } from "@/lib/icons";

interface PhotoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  subtitle?: string;
}

export function PhotoLightbox({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
}: PhotoLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-all"
        >
          <CloseCircle size={22} />
        </button>

        {/* Image preview */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-black/50 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title || "Foto dokumentasi"}
            className="max-h-[75vh] w-auto object-contain rounded-lg"
          />
        </div>

        {/* Caption */}
        {(title || subtitle) && (
          <div className="p-4 bg-neutral-900 text-white flex items-center justify-between border-t border-neutral-800">
            <div>
              {title && <h4 className="text-sm font-semibold">{title}</h4>}
              {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
            </div>
            <span className="text-[11px] text-neutral-400">Tekan Esc untuk menutup</span>
          </div>
        )}
      </div>
    </div>
  );
}
