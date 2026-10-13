"use client";

import React, { useState, useEffect } from "react";
import { MitraShell } from "@/components/mitra/MitraShell";
import { JobOfferCard } from "@/components/mitra/JobOfferCard";
import { JobCard } from "@/components/mitra/JobCard";
import { Refresh2, Briefcase } from "@/lib/icons";

export default function MitraJobsPage() {
  const [tab, setTab] = useState<"offers" | "active" | "completed">("offers");
  const [offers, setOffers] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState("all");

  const loadAll = async () => {
    try {
      setLoading(true);
      const [offRes, actRes, compRes] = await Promise.all([
        fetch("/api/mitra/jobs?tab=offers"),
        fetch("/api/mitra/jobs?tab=active"),
        fetch("/api/mitra/jobs?tab=completed"),
      ]);

      if (offRes.ok) {
        const d = await offRes.json();
        setOffers(d.jobs || []);
      }
      if (actRes.ok) {
        const d = await actRes.json();
        setActiveJobs(d.jobs || []);
      }
      if (compRes.ok) {
        const d = await compRes.json();
        setCompletedJobs(d.jobs || []);
      }
    } catch (err) {
      console.warn("Failed fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAccept = async (orderId: string) => {
    await fetch(`/api/mitra/jobs/${orderId}/accept`, { method: "POST" });
    await loadAll();
    setTab("active");
  };

  const handleDecline = async (orderId: string, reason: string) => {
    await fetch(`/api/mitra/jobs/${orderId}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    await loadAll();
  };

  return (
    <MitraShell
      title="Daftar Pekerjaan"
      newOffersCount={offers.length}
      rightAction={
        <button
          type="button"
          onClick={loadAll}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
          title="Muat Ulang"
        >
          <Refresh2 size={18} />
        </button>
      }
    >
      <div className="p-4 space-y-4">
        {/* Sliding Pill Tabs (W04, B7.9) */}
        <div className="grid grid-cols-3 p-1 bg-neutral-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setTab("offers")}
            className={`py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              tab === "offers"
                ? "bg-white text-lavender-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <span>Tawaran</span>
            {offers.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-danger-600 text-white text-[9px] font-bold flex items-center justify-center">
                {offers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("active")}
            className={`py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              tab === "active"
                ? "bg-white text-lavender-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <span>Aktif</span>
            {activeJobs.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-lavender-600 text-white text-[9px] font-bold flex items-center justify-center">
                {activeJobs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("completed")}
            className={`py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              tab === "completed"
                ? "bg-white text-lavender-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <span>Selesai</span>
            {completedJobs.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-neutral-300 text-neutral-700 text-[9px] font-bold flex items-center justify-center">
                {completedJobs.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Tawaran Baru */}
        {tab === "offers" && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {offers.length > 0 ? (
              offers.map((order) => (
                <JobOfferCard
                  key={order.id}
                  order={order}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              ))
            ) : (
              <div className="p-8 rounded-2xl bg-neutral-50 border border-dashed border-neutral-200 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-lavender-50 text-lavender-600 flex items-center justify-center mx-auto">
                  <Briefcase size={20} />
                </div>
                <h4 className="text-xs font-semibold text-neutral-800">
                  Tidak Ada Tawaran Baru
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Tawaran akan langsung masuk saat ada pesanan pelanggan baru.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Pekerjaan Aktif */}
        {tab === "active" && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {activeJobs.length > 0 ? (
              activeJobs.map((job) => <JobCard key={job.id} order={job} />)
            ) : (
              <div className="p-8 rounded-2xl bg-neutral-50 border border-dashed border-neutral-200 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-lavender-50 text-lavender-600 flex items-center justify-center mx-auto">
                  <Briefcase size={20} />
                </div>
                <h4 className="text-xs font-semibold text-neutral-800">
                  Tidak Ada Pekerjaan Aktif
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Terima tawaran pada tab Tawaran untuk memulai pekerjaan.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Pekerjaan Selesai */}
        {tab === "completed" && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {completedJobs.length > 0 ? (
              completedJobs.map((job) => <JobCard key={job.id} order={job} />)
            ) : (
              <div className="p-8 rounded-2xl bg-neutral-50 border border-dashed border-neutral-200 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-lavender-50 text-lavender-600 flex items-center justify-center mx-auto">
                  <Briefcase size={20} />
                </div>
                <h4 className="text-xs font-semibold text-neutral-800">
                  Belum Ada Pekerjaan Selesai
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Riwayat pekerjaan yang telah selesai akan tercatat di sini.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </MitraShell>
  );
}
