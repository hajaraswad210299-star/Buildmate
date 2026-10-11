"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { PhotoLightbox } from "@/components/shared/PhotoLightbox";
import {
  Verify,
  Location,
  ShieldTick,
  Clock,
  TickCircle,
  CloseCircle,
  ArrowRight,
  ArrowDown2,
  ArrowUp2,
  Briefcase,
  WhatsappIcon,
} from "@/lib/icons";
import { formatRupiah } from "@/lib/format";
import { getWorkerById } from "@/lib/data/workers";
import { getPackages } from "@/lib/data/services";
import { Worker, ServicePackage } from "@/lib/data/types";
import { DISTRICTS } from "@/lib/constants/areas";
import { createClient } from "@/lib/supabase/client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function WorkerDetailContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Service Area Check (Flamingo pattern A2 & A5)
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [areaCoverageResult, setAreaCoverageResult] = useState<"covered" | "uncovered" | null>(null);

  // Portfolio Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // User auth state
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    Promise.all([
      getWorkerById(resolvedParams.slug),
      getPackages(),
    ]).then(([wk, allPkgs]) => {
      if (wk) {
        setWorker(wk);
        // Match worker packages or fallback to category packages
        const workerPkgs =
          wk.package_ids && wk.package_ids.length > 0
            ? allPkgs.filter((p) => wk.package_ids?.includes(p.id))
            : allPkgs.slice(0, 3);

        setPackages(workerPkgs);
        if (workerPkgs.length > 0) {
          setSelectedPackageId(workerPkgs[0].id);
          setExpandedPackageId(workerPkgs[0].id);
        }
      }
      setLoading(false);
    });
  }, [resolvedParams.slug]);

  const handleCheckArea = () => {
    if (!selectedDistrict || !worker) return;
    const foundDistrict = DISTRICTS.find((d) => d.name === selectedDistrict);
    if (!foundDistrict) return;

    const workerArea = worker.service_area.toLowerCase();
    const districtArea = foundDistrict.area.toLowerCase();

    if (
      workerArea.includes(districtArea) ||
      districtArea.includes(workerArea) ||
      workerArea.includes("semua")
    ) {
      setAreaCoverageResult("covered");
    } else {
      setAreaCoverageResult("uncovered");
    }
  };

  const selectedPkg = packages.find((p) => p.id === selectedPackageId);

  const handleOrderClick = () => {
    if (!selectedPkg || !worker) return;
    const orderUrl = `/order/${selectedPkg.id}?worker=${worker.id}`;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(orderUrl)}`);
    } else {
      router.push(orderUrl);
    }
  };

  if (loading) {
    return (
      <CustomerShell title="Detail Tukang">
        <div className="min-h-[60vh] flex items-center justify-center text-xs text-neutral-400">
          Memuat profil mitra tukang...
        </div>
      </CustomerShell>
    );
  }

  if (!worker || !worker.is_active) {
    return (
      <CustomerShell title="Tukang Tidak Ditemukan">
        <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-neutral-200/90 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
            <Briefcase size={28} />
          </div>
          <h2 className="font-serif text-2xl text-neutral-900">
            Tukang Sedang Tidak Tersedia
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Mitra ini sedang tidak aktif atau profil tidak ditemukan. Kamu bisa mencari mitra tukang lainnya yang siap melayani.
          </p>
          <Link
            href="/search"
            className="inline-block px-5 py-2.5 rounded-full bg-lavender-600 text-white text-xs font-semibold shadow-xs"
          >
            Cari Tukang Lain
          </Link>
        </div>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell
      title={worker.full_name}
      showBack
      backHref="/search"
      hideBottomNav={true} // Sticky CTA bar takes over bottom nav
      hideWaButton={true}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
        {/* Breadcrumb (Flamingo pattern) */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400 mb-6">
          <Link href="/" className="hover:text-neutral-700">
            Beranda
          </Link>
          <span>/</span>
          <Link href="/search" className="hover:text-neutral-700">
            Tukang
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-medium">{worker.full_name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (Profile, Bio, Portfolio, Coverage Check) */}
          <div className="lg:col-span-7 space-y-8">
            {/* Header Profil (Foto 96px bulat, Nama Serif 32px, Stats) */}
            <div className="flex items-start gap-4 sm:gap-6 bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-xs">
              <div className="relative shrink-0">
                <div
                  className={`w-24 h-24 rounded-full overflow-hidden border-2 ${
                    worker.is_verified ? "border-lavender-600 ring-4 ring-lavender-100" : "border-neutral-200"
                  }`}
                >
                  {worker.photo_path ? (
                    <img
                      src={worker.photo_path}
                      alt={worker.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-lavender-100 text-lavender-800 font-bold text-2xl">
                      {worker.full_name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-2xl sm:text-[32px] text-neutral-900 leading-tight">
                    {worker.full_name}
                  </h1>
                  {worker.is_verified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-lavender-50 border border-lavender-200/70 text-lavender-700 text-[11px] font-semibold">
                      <Verify size={13} variant="Bold" />
                      <span>Terverifikasi</span>
                    </span>
                  )}
                </div>

                {/* Stats Row */}
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-neutral-600">
                  <span className="font-semibold text-neutral-900">
                    {worker.completed_jobs_count || 0} pekerjaan selesai
                  </span>
                  <span>•</span>
                  <span>{worker.experience_years} tahun pengalaman</span>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-neutral-500">
                    <Location size={13} className="text-neutral-400" />
                    <span>{worker.service_area}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio Section with Truncate */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3">
              <h3 className="font-serif text-xl text-neutral-900">
                Tentang Tukang
              </h3>
              <p
                className={`text-xs sm:text-sm text-neutral-600 leading-relaxed ${
                  !bioExpanded ? "line-clamp-3" : ""
                }`}
              >
                {worker.bio ||
                  "Mitra tukang berpengalaman yang siap membantu perbaikan rumah ringan dengan teliti dan tepat waktu."}
              </p>
              {worker.bio && worker.bio.length > 120 && (
                <button
                  type="button"
                  onClick={() => setBioExpanded(!bioExpanded)}
                  className="text-xs font-semibold text-lavender-700 hover:underline"
                >
                  {bioExpanded ? "Lebih sedikit" : "Selengkapnya"}
                </button>
              )}
            </div>

            {/* Portfolio Gallery with Lightbox */}
            {worker.portfolio_paths && worker.portfolio_paths.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3">
                <h3 className="font-serif text-xl text-neutral-900">
                  Foto Hasil Pekerjaan
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  {worker.portfolio_paths.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setLightboxIndex(idx);
                        setLightboxOpen(true);
                      }}
                      className="group relative aspect-square rounded-2xl overflow-hidden border border-neutral-200/90 bg-neutral-100 hover:opacity-95 transition-all"
                    >
                      <img
                        src={imgUrl}
                        alt={`Portofolio ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cek Area Layanan (Flamingo Estate Pattern A2 & A5) */}
            <div className="bg-cream-100 p-6 rounded-3xl border border-cream-200/80 space-y-4">
              <div>
                <h3 className="font-serif text-xl text-neutral-900">
                  Cek Jangkauan Area Layanan
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Pastikan alamat rumahmu termasuk dalam area kerja mitra ini.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setAreaCoverageResult(null);
                  }}
                  className="flex-1 h-12 px-3 rounded-2xl border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-none focus:border-lavender-600"
                >
                  <option value="">Pilih kecamatan kamu...</option>
                  {DISTRICTS.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.area})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleCheckArea}
                  disabled={!selectedDistrict}
                  className="h-12 px-4 rounded-2xl bg-lavender-600 hover:bg-lavender-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center justify-center shrink-0 active:scale-95 transition-all"
                  aria-label="Periksa area"
                >
                  <ArrowRight size={16} />
                </button>
              </div>

              {areaCoverageResult === "covered" && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                  <TickCircle size={16} variant="Bold" className="text-emerald-600 shrink-0" />
                  <span>
                    Kabar baik! Tukang ini melayani wilayah <strong>{selectedDistrict}</strong>.
                  </span>
                </div>
              )}

              {areaCoverageResult === "uncovered" && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CloseCircle size={16} variant="Bold" className="text-amber-600 shrink-0" />
                    <span>Di luar area jangkauan tukang ini.</span>
                  </div>
                  <Link
                    href={`/search?area=${selectedDistrict}`}
                    className="font-bold underline text-amber-900 hover:text-amber-700"
                  >
                    Lihat tukang lain
                  </Link>
                </div>
              )}
            </div>

            {/* Escrow Guarantee Box */}
            <div className="p-4 rounded-2xl bg-lavender-50 border border-lavender-200/80 flex items-start gap-3">
              <ShieldTick size={24} variant="Bulk" className="text-lavender-600 shrink-0 mt-0.5" />
              <p className="text-xs text-lavender-900 leading-relaxed">
                <strong>Pembayaran Aman (Rekening Bersama):</strong> Dana yang kamu bayarkan baru diteruskan ke tukang setelah kamu memeriksa foto hasil dan mengonfirmasi pekerjaan selesai.
              </p>
            </div>
          </div>

          {/* Right Column (Paket Layanan Radio Cards & Sticky Card on Desktop) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-4 lg:sticky lg:top-24">
              <div>
                <h3 className="font-serif text-2xl text-neutral-900">
                  Pilih Paket Pekerjaan
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Harga sudah pasti sesuai cakupan yang tertera.
                </p>
              </div>

              {/* Radio Cards with Accordion Scope (C04) */}
              <div className="space-y-3">
                {packages.map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id;
                  const isExpanded = expandedPackageId === pkg.id;

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                        isSelected
                          ? "border-lavender-600 bg-lavender-50/40 ring-2 ring-lavender-100"
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                      }`}
                    >
                      {/* Card Header (Radio + Title + Price) */}
                      <div className="p-4 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="worker_package"
                            checked={isSelected}
                            onChange={() => setSelectedPackageId(pkg.id)}
                            className="mt-1 text-lavender-600 focus:ring-lavender-500 w-4 h-4"
                          />
                          <div>
                            <h4 className="font-serif text-[19px] text-neutral-900 leading-snug">
                              {pkg.name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                              <Clock size={13} className="text-neutral-400" />
                              <span>{pkg.est_duration_minutes} menit</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-semibold text-neutral-900 font-sans">
                            {formatRupiah(pkg.price)}
                          </span>
                        </div>
                      </div>

                      {/* Accordion Toggle for Inclusions/Exclusions */}
                      <div className="px-4 pb-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPackageId(isExpanded ? null : pkg.id);
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-lavender-700 hover:underline"
                        >
                          <span>{isExpanded ? "Tutup rincian cakupan" : "Lihat apa yang termasuk"}</span>
                          {isExpanded ? <ArrowUp2 size={12} /> : <ArrowDown2 size={12} />}
                        </button>

                        {/* Accordion Content */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-neutral-200/60 space-y-2 text-xs animate-in fade-in duration-150">
                            {/* Termasuk */}
                            {pkg.inclusions && pkg.inclusions.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-semibold text-emerald-700 block">
                                  Termasuk:
                                </span>
                                {pkg.inclusions.map((inc, i) => (
                                  <div key={i} className="flex items-start gap-1.5 text-neutral-600">
                                    <TickCircle size={13} variant="Bold" className="text-emerald-600 shrink-0 mt-0.5" />
                                    <span>{inc}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Tidak termasuk */}
                            {pkg.exclusions && pkg.exclusions.length > 0 && (
                              <div className="space-y-1 pt-2">
                                <span className="text-[11px] font-semibold text-neutral-500 block">
                                  Tidak termasuk:
                                </span>
                                {pkg.exclusions.map((exc, i) => (
                                  <div key={i} className="flex items-start gap-1.5 text-neutral-500">
                                    <CloseCircle size={13} variant="Bold" className="text-neutral-400 shrink-0 mt-0.5" />
                                    <span>{exc}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Direct Order Button */}
              <div className="pt-4 border-t border-neutral-100 hidden lg:block">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-neutral-500">Total Harga Paket</span>
                  <span className="text-lg font-bold text-neutral-900 font-sans">
                    {selectedPkg ? formatRupiah(selectedPkg.price) : "-"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleOrderClick}
                  disabled={!selectedPkg}
                  className="w-full h-12 rounded-full bg-lavender-600 hover:bg-lavender-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Pesan Tukang Ini</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom CTA Bar (Mobile & Tablet, A3 & C04) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 p-3 sm:px-6 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-lg flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] text-neutral-400 line-clamp-1">
            {selectedPkg?.name || "Pilih paket"}
          </p>
          <p className="text-base font-bold text-neutral-900 font-sans tracking-tight">
            {selectedPkg ? formatRupiah(selectedPkg.price) : "-"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOrderClick}
          disabled={!selectedPkg}
          className="h-11 px-6 rounded-full bg-lavender-600 hover:bg-lavender-700 active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all shrink-0"
        >
          <span>Pesan Sekarang</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && worker.portfolio_paths && (
        <PhotoLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          imageUrl={worker.portfolio_paths[lightboxIndex] || ""}
          title={`Hasil Pekerjaan — ${worker.full_name}`}
        />
      )}
    </CustomerShell>
  );
}

export default function WorkerDetailPage(props: PageProps) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-cream-50 flex items-center justify-center text-xs text-neutral-400">
          Memuat profil mitra...
        </div>
      }
    >
      <WorkerDetailContent {...props} />
    </React.Suspense>
  );
}
