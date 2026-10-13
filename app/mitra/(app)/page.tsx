"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MitraShell } from "@/components/mitra/MitraShell";
import { JobOfferCard } from "@/components/mitra/JobOfferCard";
import { JobCard } from "@/components/mitra/JobCard";
import { useCountUp } from "@/hooks/useCountUp";
import { formatRupiah } from "@/lib/format";
import {
  Briefcase,
  Wallet3,
  Clock,
  Verify,
  ArrowRight,
  ArrowRight2,
} from "@/lib/icons";

export default function MitraHomePage() {
  const [loading, setLoading] = useState(true);
  const [workerName, setWorkerName] = useState("Budi");
  const [stats, setStats] = useState({
    jobs_this_month: 3,
    earnings_this_month: 450000,
    pending_payout: 350000,
  });
  const [offers, setOffers] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);

  // Count-up hooks for 3 summary cards (A4, B8)
  const animatedJobs = useCountUp(stats.jobs_this_month);
  const animatedEarnings = useCountUp(stats.earnings_this_month);
  const animatedPending = useCountUp(stats.pending_payout);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      // Fetch application/profile
      const appRes = await fetch("/api/mitra/application");
      if (appRes.ok) {
        const appJson = await appRes.json();
        if (appJson.application?.full_name) {
          const first = appJson.application.full_name.split(" ")[0];
          setWorkerName(first);
        }
      }

      // Fetch offers
      const offersRes = await fetch("/api/mitra/jobs?tab=offers");
      if (offersRes.ok) {
        const offersJson = await offersRes.json();
        setOffers(offersJson.jobs || []);
      }

      // Fetch active jobs
      const activeRes = await fetch("/api/mitra/jobs?tab=active");
      if (activeRes.ok) {
        const activeJson = await activeRes.json();
        setActiveJobs(activeJson.jobs || []);
      }
    } catch (err) {
      console.warn("Failed fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleAcceptOffer = async (orderId: string) => {
    try {
      const res = await fetch(`/api/mitra/jobs/${orderId}/accept`, {
        method: "POST",
      });
      if (res.ok) {
        await loadDashboard();
      }
    } catch (err) {
      console.error("Accept error:", err);
    }
  };

  const handleDeclineOffer = async (orderId: string, reason: string) => {
    try {
      const res = await fetch(`/api/mitra/jobs/${orderId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        await loadDashboard();
      }
    } catch (err) {
      console.error("Decline error:", err);
    }
  };

  return (
    <MitraShell newOffersCount={offers.length} isVerified={true}>
      <div className="p-4 space-y-6">
        {/* Sapaan Header (W03) */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="font-serif text-2xl text-neutral-900 leading-tight">
              Halo, <span className="italic text-lavender-700">{workerName}</span>
            </h1>
            <p className="text-xs text-neutral-500">
              Siap melayani pelanggan BuildMate hari ini?
            </p>
          </div>

          <div className="w-10 h-10 rounded-full bg-lavender-100/80 border border-lavender-200 flex items-center justify-center text-lavender-800 font-bold text-sm shrink-0">
            {workerName.charAt(0)}
          </div>
        </div>

        {/* 3 Summary Cards with Count-up (A4, B7.5) */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Card 1: Pekerjaan Bulan Ini */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-1">
            <span className="text-[10px] text-neutral-500 font-medium block truncate">
              Pekerjaan Bulan Ini
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-sans text-xl font-bold text-neutral-900 tabular-nums">
                {animatedJobs}
              </span>
              <span className="text-[10px] text-neutral-400">order</span>
            </div>
          </div>

          {/* Card 2: Pendapatan Bulan Ini */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-1">
            <span className="text-[10px] text-neutral-500 font-medium block truncate">
              Pendapatan
            </span>
            <span className="font-sans text-xs font-bold text-lavender-800 tabular-nums block truncate">
              {formatRupiah(animatedEarnings)}
            </span>
          </div>

          {/* Card 3: Menunggu Pencairan */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-1">
            <span className="text-[10px] text-neutral-500 font-medium block truncate">
              Menunggu Cair
            </span>
            <span className="font-sans text-xs font-bold text-warning-700 tabular-nums block truncate">
              {formatRupiah(animatedPending)}
            </span>
          </div>
        </div>

        {/* Section: Tawaran Baru (JobOfferCard) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-medium text-neutral-900">
                Tawaran Pekerjaan Baru
              </h2>
              {offers.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-danger-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {offers.length}
                </span>
              )}
            </div>
            {offers.length > 0 && (
              <span className="text-[11px] text-neutral-400">
                Terima segera
              </span>
            )}
          </div>

          {offers.length > 0 ? (
            <div className="space-y-3">
              {offers.map((offer) => (
                <JobOfferCard
                  key={offer.id}
                  order={offer}
                  onAccept={handleAcceptOffer}
                  onDecline={handleDeclineOffer}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-neutral-50 border border-dashed border-neutral-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-lavender-50 text-lavender-600 flex items-center justify-center mx-auto">
                <Briefcase size={24} variant="Bulk" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-neutral-800">
                  Belum Ada Tawaran Masuk
                </h4>
                <p className="text-[11px] text-neutral-500 max-w-xs mx-auto leading-relaxed">
                  Tawaran baru akan otomatis muncul di sini saat ada pesanan pelanggan di area layananmu.
                </p>
              </div>
              <Link
                href="/mitra/profile"
                className="inline-flex items-center gap-1 text-xs font-semibold text-lavender-700 hover:underline pt-1"
              >
                <span>Periksa Profil & Jangkauan Area</span>
                <ArrowRight2 size={13} />
              </Link>
            </div>
          )}
        </div>

        {/* Section: Pekerjaan Aktif Hari Ini */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-neutral-900">
              Pekerjaan Aktif
            </h2>
            <Link
              href="/mitra/jobs"
              className="text-xs font-semibold text-lavender-700 hover:underline flex items-center gap-0.5"
            >
              <span>Semua</span>
              <ArrowRight2 size={13} />
            </Link>
          </div>

          {activeJobs.length > 0 ? (
            <div className="space-y-2.5">
              {activeJobs.slice(0, 3).map((job) => (
                <JobCard key={job.id} order={job} />
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-center text-xs text-neutral-500">
              Tidak ada pekerjaan yang sedang berjalan saat ini.
            </div>
          )}
        </div>
      </div>
    </MitraShell>
  );
}
