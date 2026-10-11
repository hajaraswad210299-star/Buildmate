"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "@/lib/icons";

interface DuoCardItem {
  tag?: string;
  title: string;
  italicTitle?: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  ctaText: string;
  ctaHref: string;
}

interface EditorialDuoCardsProps {
  cardLeft: DuoCardItem;
  cardRight: DuoCardItem;
  className?: string;
}

export function EditorialDuoCards({
  cardLeft,
  cardRight,
  className = "",
}: EditorialDuoCardsProps) {
  return (
    <section className={`w-full px-6 py-10 sm:py-16 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Card */}
        <div className="flex flex-col text-center group">
          <div className="relative aspect-[4/5] sm:aspect-[3/4] rounded-[28px] sm:rounded-[36px] overflow-hidden bg-neutral-100 border border-neutral-200/80 shadow-xs mb-6 sm:mb-8">
            <img
              src={cardLeft.imageUrl}
              alt={cardLeft.imageAlt}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            {cardLeft.tag && (
              <span className="absolute top-5 left-5 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-semibold tracking-wider uppercase text-neutral-800 shadow-xs">
                {cardLeft.tag}
              </span>
            )}
          </div>

          <div className="max-w-md mx-auto space-y-3 px-2">
            <h3 className="font-serif text-3xl sm:text-[36px] text-neutral-900 leading-tight tracking-tight">
              {cardLeft.title}{" "}
              {cardLeft.italicTitle && (
                <span className="italic text-lavender-700 font-normal">
                  {cardLeft.italicTitle}
                </span>
              )}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
              {cardLeft.description}
            </p>
            <div className="pt-2">
              <Link
                href={cardLeft.ctaHref}
                className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-[#222923] hover:bg-neutral-900 active:scale-95 text-white text-xs font-semibold tracking-wider uppercase transition-all shadow-xs hover:shadow-md"
              >
                <span>{cardLeft.ctaText}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Card */}
        <div className="flex flex-col text-center group">
          <div className="relative aspect-[4/5] sm:aspect-[3/4] rounded-[28px] sm:rounded-[36px] overflow-hidden bg-neutral-100 border border-neutral-200/80 shadow-xs mb-6 sm:mb-8">
            <img
              src={cardRight.imageUrl}
              alt={cardRight.imageAlt}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            {cardRight.tag && (
              <span className="absolute top-5 left-5 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-semibold tracking-wider uppercase text-neutral-800 shadow-xs">
                {cardRight.tag}
              </span>
            )}
          </div>

          <div className="max-w-md mx-auto space-y-3 px-2">
            <h3 className="font-serif text-3xl sm:text-[36px] text-neutral-900 leading-tight tracking-tight">
              {cardRight.title}{" "}
              {cardRight.italicTitle && (
                <span className="italic text-lavender-700 font-normal">
                  {cardRight.italicTitle}
                </span>
              )}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
              {cardRight.description}
            </p>
            <div className="pt-2">
              <Link
                href={cardRight.ctaHref}
                className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-[#222923] hover:bg-neutral-900 active:scale-95 text-white text-xs font-semibold tracking-wider uppercase transition-all shadow-xs hover:shadow-md"
              >
                <span>{cardRight.ctaText}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
