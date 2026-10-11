"use client";

import React from "react";
import { ShieldTick, Verify, Camera, Crown1 } from "@/lib/icons";

interface EditorialQuoteProps {
  quote?: string;
  attribution?: string;
  className?: string;
}

export function EditorialQuote({
  quote = "Rumah bukan sekadar bangunan fisik, melainkan tempat di mana rasa tenang bermula. Kami memastikan setiap pengerjaan ditangani oleh tangan ahli yang terampil, jujur, dan berdedikasi.",
  attribution = "KOMITMEN KUALITAS BUILDMATE",
  className = "",
}: EditorialQuoteProps) {
  return (
    <section className={`py-16 sm:py-24 bg-cream-100/60 border-y border-cream-200/60 ${className}`}>
      <div className="max-w-4xl mx-auto px-6 text-center space-y-8 font-sans">
        <p className="text-[11px] font-semibold text-neutral-500 tracking-[0.25em] uppercase">
          {attribution}
        </p>

        <blockquote className="font-sans text-xl sm:text-3xl lg:text-[32px] font-medium text-neutral-900 leading-[1.35] tracking-tight max-w-3xl mx-auto">
          “{quote}”
        </blockquote>

        {/* Press / Trust Hallmarks (Full Geist) */}
        <div className="pt-6 border-t border-cream-200/80 flex flex-wrap items-center justify-center gap-8 sm:gap-14 text-neutral-500 font-sans tracking-wide text-xs sm:text-[13px] uppercase">
          <div className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors">
            <ShieldTick size={16} className="text-lavender-600" variant="Bulk" />
            <span className="font-medium">Midtrans Rekber Escrow</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors">
            <Verify size={16} className="text-lavender-600" variant="Bulk" />
            <span className="font-medium">Mitra Terverifikasi 100%</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors">
            <Camera size={16} className="text-lavender-600" variant="Bulk" />
            <span className="font-medium">Bukti Foto Sebelum & Sesudah</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors">
            <Crown1 size={16} className="text-lavender-600" variant="Bold" />
            <span className="font-medium">Garansi Kerja Nyata</span>
          </div>
        </div>
      </div>
    </section>
  );
}
