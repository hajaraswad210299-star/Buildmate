"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { ApplicationStatusTimeline } from "@/components/mitra/ApplicationStatusTimeline";
import {
  Verify,
  InfoCircle,
  Warning2,
  Clock,
  WhatsappIcon,
  ArrowRight,
  Edit2,
} from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";

export default function MitraStatusPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [appData, setAppData] = useState<any>(null);

  // Load application status
  const loadStatus = async () => {
    try {
      const res = await fetch("/api/mitra/application");
      if (res.ok) {
        const json = await res.json();
        if (json.application) {
          const st = json.application.application_status;
          setStatus(st || "pending");
          setRejectionReason(json.application.rejection_reason || null);
          setAppData(json.application);

          if (st === "approved") {
            triggerCelebration();
          }
        }
      }
    } catch (err) {
      console.warn("Failed fetching status:", err);
    } finally {
      setLoading(false);
    }
  };

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#7A5CE6", "#9277F2", "#E0D8FF", "#17B26A"],
      });
    } catch {}
  };

  useEffect(() => {
    loadStatus();

    // Fallback polling 30 seconds
    const interval = setInterval(loadStatus, 30000);

    // Supabase Realtime subscription on workers table
    const supabase = createClient();
    const channel = supabase
      .channel("worker_status_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workers",
        },
        (payload: any) => {
          if (payload.new?.application_status) {
            setStatus(payload.new.application_status);
            setRejectionReason(payload.new.rejection_reason || null);
            if (payload.new.application_status === "approved") {
              triggerCelebration();
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleFixAndResubmit = async () => {
    try {
      // Revert status to draft
      await fetch("/api/mitra/application", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_status: "draft" }),
      });
      router.push("/mitra/daftar");
    } catch {
      router.push("/mitra/daftar");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-lavender-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100/60 flex justify-center text-neutral-900 font-sans">
      <div className="w-full max-w-[480px] bg-white min-h-screen flex flex-col shadow-sm relative">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-neutral-200/80 px-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-medium text-neutral-900">
              Status Pendaftaran
            </span>
          </div>
          {status === "approved" ? (
            <span className="text-[10px] font-semibold text-success-700 bg-success-50 px-2 py-0.5 rounded-full border border-success-200">
              Disetujui
            </span>
          ) : status === "rejected" ? (
            <span className="text-[10px] font-semibold text-danger-700 bg-danger-50 px-2 py-0.5 rounded-full border border-danger-200">
              Perlu Perbaikan
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-lavender-700 bg-lavender-50 px-2 py-0.5 rounded-full border border-lavender-200">
              Menunggu Review
            </span>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 p-5 space-y-6">
          {/* ================= STATE: APPROVED ================= */}
          {status === "approved" && (
            <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 rounded-full bg-success-50 border-2 border-success-200 text-success-600 flex items-center justify-center mx-auto shadow-sm">
                <Verify size={42} variant="Bold" className="text-success-600" />
              </div>

              <div className="space-y-2">
                <h2 className="font-serif text-3xl text-neutral-900 leading-tight">
                  Selamat, kamu resmi jadi <br />
                  <span className="italic text-lavender-700">Mitra BuildMate</span>!
                </h2>
                <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
                  Profilmu kini aktif dan akan tampil saat pelanggan mencari layanan perbaikan rumah di sekitarmu.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-lavender-50/70 border border-lavender-200 text-left space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-lavender-900">
                  <span>Profil Terverifikasi</span>
                  <span className="text-[11px] font-normal text-lavender-700">Area {appData?.service_area}</span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Tawaran pekerjaan baru akan langsung masuk ke halaman berandamu. Siapkan peralatan dan aktifkan notifikasi!
                </p>
              </div>

              <div className="pt-4">
                <Link
                  href="/mitra"
                  className="w-full h-14 rounded-2xl bg-lavender-600 hover:bg-lavender-700 active:bg-lavender-800 text-sm font-semibold text-white shadow-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Mulai Terima Pekerjaan</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          )}

          {/* ================= STATE: REJECTED ================= */}
          {status === "rejected" && (
            <div className="space-y-6 py-2 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-danger-50 border border-danger-200 text-danger-600 flex items-center justify-center mx-auto">
                <Warning2 size={32} variant="Bulk" />
              </div>

              <div className="text-center space-y-1.5">
                <h2 className="font-serif text-2xl text-neutral-900">
                  Pendaftaran Belum Dapat Disetujui
                </h2>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  Ada beberapa data yang perlu kamu perbaiki sebelum akunmu bisa diaktifkan.
                </p>
              </div>

              {/* Reason Box */}
              <div className="p-4 rounded-2xl bg-danger-50/70 border border-danger-200 text-xs text-danger-900 space-y-1.5">
                <span className="font-semibold block text-danger-800">
                  Alasan Penolakan dari Admin:
                </span>
                <p className="text-xs text-danger-700 leading-relaxed bg-white/70 p-3 rounded-xl border border-danger-100">
                  &ldquo;{rejectionReason || "Data diri atau foto profil kurang jelas. Mohon perbaiki dan ajukan ulang."}&rdquo;
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleFixAndResubmit}
                  className="w-full h-14 rounded-2xl bg-lavender-600 hover:bg-lavender-700 text-sm font-semibold text-white shadow-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Edit2 size={18} />
                  <span>Perbaiki & Ajukan Ulang</span>
                </button>

                <a
                  href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                    "Halo Admin BuildMate, saya ingin menanyakan mengenai pendaftaran mitra saya yang ditolak: " + (rejectionReason || "")
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center justify-center gap-2 transition-colors"
                >
                  <WhatsappIcon size={16} className="text-success-600" />
                  <span>Tanya Tim Admin via WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          {/* ================= STATE: PENDING (MENUNGGU REVIEW) ================= */}
          {status === "pending" && (
            <div className="space-y-6 py-2 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h2 className="font-serif text-2xl text-neutral-900">
                  Pendaftaran Sedang Ditinjau
                </h2>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Terima kasih sudah mendaftar sebagai mitra. Tim kami sedang memverifikasi datamu.
                </p>
              </div>

              {/* 3-Step Timeline with Pulse Indicator */}
              <ApplicationStatusTimeline status="pending" />

              {/* Application Summary Box */}
              {appData && (
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-2">
                  <h4 className="font-semibold text-neutral-800 text-xs">
                    Ringkasan Pendaftaran Kamu:
                  </h4>
                  <div className="space-y-1 text-[11px]">
                    <p><strong>Nama:</strong> {appData.full_name}</p>
                    <p><strong>WhatsApp:</strong> {appData.phone}</p>
                    <p><strong>Area Layanan:</strong> {appData.service_area}</p>
                    <p><strong>Pengalaman:</strong> {appData.experience_years} Tahun</p>
                  </div>
                </div>
              )}

              {/* WhatsApp Help CTA */}
              <div className="pt-2">
                <a
                  href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                    "Halo Admin BuildMate, saya ingin menanyakan status pendaftaran mitra atas nama " + (appData?.full_name || "")
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center justify-center gap-2 transition-colors"
                >
                  <WhatsappIcon size={16} className="text-success-600" />
                  <span>Hubungi Tim BuildMate via WhatsApp</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
