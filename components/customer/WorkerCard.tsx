"use client";

import React from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { Verify, Location, ArrowRight } from "@/lib/icons";

interface WorkerCardProps {
  id: string;
  slug: string;
  fullName: string;
  photoPath?: string | null;
  serviceArea: string;
  isVerified?: boolean;
  completedJobsCount?: number;
  experienceYears?: number;
  categoryName?: string;
  startingPrice?: number;
}

export function WorkerCard({
  slug,
  fullName,
  photoPath,
  serviceArea,
  isVerified = true,
  completedJobsCount = 0,
  experienceYears = 3,
  categoryName = "Plumbing",
  startingPrice = 150000,
}: WorkerCardProps) {
  return (
    <Link
      href={`/workers/${slug}`}
      className="group block p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-xs hover:border-lavender-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
    >
      <div className="flex items-start gap-3.5">
        {/* 1:1 Photo radius 14px */}
        <div className="relative w-20 h-20 rounded-[14px] bg-neutral-100 border border-neutral-200/80 overflow-hidden shrink-0">
          {photoPath ? (
            <img
              src={photoPath}
              alt={fullName}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-lavender-100 text-lavender-800 font-bold text-lg">
              {fullName.charAt(0)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-serif text-[19px] sm:text-[21px] text-neutral-900 truncate tracking-tight group-hover:text-lavender-700 transition-colors">
              {fullName}
            </h3>
            {isVerified && (
              <span title="Tukang Terverifikasi">
                <Verify size={16} variant="Bold" className="text-lavender-600 shrink-0" />
              </span>
            )}
          </div>

          {/* Area & Experience */}
          <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
            <div className="flex items-center gap-1 truncate">
              <Location size={13} className="text-neutral-400 shrink-0" />
              <span className="truncate">{serviceArea}</span>
            </div>
            <span>•</span>
            <span className="shrink-0">{experienceYears} thn</span>
          </div>

          {/* Jobs Count & Category Chip */}
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-block px-2 py-0.5 rounded-md bg-cream-100 text-[10px] font-semibold text-neutral-700">
              {categoryName}
            </span>
            <span className="text-[11px] text-neutral-500 font-medium">
              {completedJobsCount > 0
                ? `${completedJobsCount} pekerjaan selesai`
                : "Mitra baru"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Price & Action */}
      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
            Mulai dari
          </span>
          <span className="text-sm font-semibold text-neutral-900 font-sans">
            {formatRupiah(startingPrice)}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-lavender-700 group-hover:translate-x-0.5 transition-transform">
          <span>Lihat Profil</span>
          <ArrowRight size={13} />
        </div>
      </div>
    </Link>
  );
}
