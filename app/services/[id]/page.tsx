"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { WorkerCard } from "@/components/customer/WorkerCard";
import {
  Clock,
  ShieldTick,
  Verify,
  Crown1,
  TickCircle,
  CloseCircle,
  InfoCircle,
  ArrowRight,
  ArrowLeft2,
  Star1,
  Location,
  WhatsappIcon,
  Drop,
  Brush2,
  Ruler,
  Wind,
  Setting4,
} from "@/lib/icons";
import { formatRupiah } from "@/lib/format";
import { getPackages } from "@/lib/data/services";
import { getWorkers } from "@/lib/data/workers";
import { ServicePackage, Worker } from "@/lib/data/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

function ServiceDetailContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [pkg, setPkg] = useState<ServicePackage | null>(null);
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    Promise.all([getPackages(), getWorkers({ tab: "active" })]).then(
      ([pkgs, allWorkers]) => {
        const found = pkgs.find(
          (p) =>
            p.id === resolvedParams.id ||
            p.name.toLowerCase().replace(/\s+/g, "-") === resolvedParams.id
        );
        const currentPkg = found || pkgs[0] || null;
        setPkg(currentPkg);

        if (currentPkg) {
          // Filter workers relevant to this category or area
          const relevant = allWorkers.filter((w) => {
            if (!currentPkg.category_slug) return true;
            const cat = currentPkg.category_slug.toLowerCase();
            if (cat.includes("plumbing") && (w.bio.toLowerCase().includes("pipa") || w.bio.toLowerCase().includes("plumbing") || w.bio.toLowerCase().includes("keran"))) return true;
            if (cat.includes("cat") && (w.bio.toLowerCase().includes("cat") || w.bio.toLowerCase().includes("dinding"))) return true;
            if (cat.includes("ac") && (w.bio.toLowerCase().includes("ac") || w.bio.toLowerCase().includes("freon"))) return true;
            if (cat.includes("perbaikan") && (w.bio.toLowerCase().includes("listrik") || w.bio.toLowerCase().includes("kunci") || w.bio.toLowerCase().includes("pintu"))) return true;
            return true;
          });
          setAvailableWorkers(relevant.slice(0, 4));
        }

        setLoading(false);
      }
    );
  }, [resolvedParams.id]);

  const renderCategoryIcon = () => {
    const slug = pkg?.category_slug?.toLowerCase() || "plumbing";
    switch (slug) {
      case "plumbing":
        return <Drop size={32} variant="Bulk" className="text-lavender-600" />;
      case "pengecatan":
        return <Brush2 size={32} variant="Bulk" className="text-lavender-600" />;
      case "perbaikan-umum":
        return <Ruler size={32} variant="Bulk" className="text-lavender-600" />;
      case "servis-ac":
        return <Wind size={32} variant="Bulk" className="text-lavender-600" />;
      default:
        return <Setting4 size={32} variant="Bulk" className="text-lavender-600" />;
    }
  };

  if (loading) {
    return (
      <CustomerShell title="Memuat Layanan...">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-4 bg-neutral-200 rounded w-1/4" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-6 aspect-[4/3] bg-neutral-200 rounded-2xl" />
              <div className="lg:col-span-6 space-y-4">
                <div className="h-8 bg-neutral-200 rounded w-3/4" />
                <div className="h-4 bg-neutral-200 rounded w-1/2" />
                <div className="h-24 bg-neutral-200 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </CustomerShell>
    );
  }

  if (!pkg) {
    return (
      <CustomerShell title="Layanan Tidak Ditemukan">
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <h2 className="font-serif text-2xl text-neutral-900 mb-2">
            Paket Layanan Tidak Ditemukan
          </h2>
          <p className="text-sm text-neutral-500 mb-6">
            Layanan yang kamu cari mungkin telah dinonaktifkan atau dihapus oleh admin.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold"
          >
            <ArrowLeft2 size={16} />
            <span>Kembali ke Pencarian</span>
          </Link>
        </div>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell
      title={pkg.name}
      showBack={true}
      backHref="/search?tab=packages"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6 font-medium">
          <Link href="/" className="hover:text-lavender-700 transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <Link
            href="/search?tab=packages"
            className="hover:text-lavender-700 transition-colors"
          >
            Layanan
          </Link>
          <span>/</span>
          <Link
            href={`/search?category=${pkg.category_slug}&tab=packages`}
            className="hover:text-lavender-700 transition-colors"
          >
            {pkg.category_name || "Kategori"}
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-semibold truncate max-w-[200px]">
            {pkg.name}
          </span>
        </nav>

        {/* Top Hero Layout: Photo (Left) & Package Summary (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-14">
          {/* Left Column: Still Life Photo & Guarantees */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-cream-100 border border-neutral-200/90 shadow-sm group">
              {pkg.image_url && !imageError ? (
                <img
                  src={pkg.image_url}
                  alt={pkg.name}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-xs flex items-center justify-center mb-3">
                    {renderCategoryIcon()}
                  </div>
                  <span className="text-xs text-neutral-400 font-medium font-sans">
                    {pkg.category_name}
                  </span>
                </div>
              )}

              {/* Category Pill Tag */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-sm text-xs font-semibold text-neutral-900 shadow-xs border border-white/60">
                  {pkg.category_name}
                </span>
                {pkg.badge && (
                  <span className="px-3 py-1.5 rounded-full bg-neutral-900/90 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider shadow-xs">
                    {pkg.badge}
                  </span>
                )}
              </div>
            </div>

            {/* Trust Assurance Card */}
            <div className="rounded-2xl bg-white border border-neutral-200/80 p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldTick size={18} variant="Bold" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 mb-0.5">
                    Rekening Bersama
                  </h4>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Dana aman, diteruskan setelah kamu konfirmasi pekerjaan tuntas.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-lavender-50 text-lavender-700 flex items-center justify-center shrink-0">
                  <Verify size={18} variant="Bold" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 mb-0.5">
                    Garansi 14 Hari
                  </h4>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Pengerjaan ulang tanpa biaya jika hasil belum sesuai standar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Crown1 size={18} variant="Bold" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 mb-0.5">
                    Mitra Terkurasi
                  </h4>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Lolos seleksi ketat identitas KTP & bebas catatan kriminal.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Information, Pricing, & Ordering */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2.5 text-xs text-neutral-500 mb-2 font-medium">
                <span className="uppercase tracking-wider text-lavender-700 font-semibold">
                  {pkg.category_name}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-neutral-600">
                  <Clock size={13} className="text-neutral-400" />
                  <span>Estimasi {pkg.est_duration_minutes} menit</span>
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl text-neutral-900 leading-tight tracking-tight mb-3">
                {pkg.name}
              </h1>

              {pkg.description && (
                <p className="text-sm text-neutral-600 leading-relaxed font-sans">
                  {pkg.description}
                </p>
              )}

              {/* Social Proof */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-600 pt-3 border-t border-neutral-100">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                  <Star1 size={16} className="text-amber-500" variant="Bold" />
                  <span>4.9</span>
                  <span className="text-neutral-400 font-normal">
                    (120+ ulasan terverifikasi)
                  </span>
                </div>
                <span>•</span>
                <span className="text-neutral-600">
                  <strong className="text-neutral-900 font-semibold">
                    {pkg.worker_count || 8}
                  </strong>{" "}
                  mitra siap bertugas hari ini
                </span>
              </div>
            </div>

            {/* Pricing Box */}
            <div className="rounded-2xl bg-lavender-50/70 border border-lavender-200/80 p-5 sm:p-6 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-lavender-800 block">
                    Tarif Paket Pasti
                  </span>
                  <span className="font-serif text-3xl sm:text-4xl text-neutral-900 tracking-tight">
                    {formatRupiah(pkg.price)}
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200">
                  Harga Final Transparan
                </span>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                Tarif sudah termasuk jasa kerja tukang, garansi pengerjaan 14 hari, dan perlindungan pembayaran rekening bersama BuildMate. Tidak ada pungutan liar di tempat.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/order/${pkg.id}`}
                  className="flex-1 py-3.5 px-6 rounded-full bg-lavender-600 hover:bg-lavender-700 active:scale-[0.98] text-white text-sm font-semibold tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span>Pesan Paket Sekarang</span>
                  <ArrowRight size={16} />
                </Link>

                <a
                  href="#tukang"
                  className="py-3.5 px-6 rounded-full bg-white hover:bg-neutral-50 active:scale-[0.98] border border-neutral-300 text-neutral-800 text-sm font-semibold flex items-center justify-center transition-all"
                >
                  Pilih Tukang Spesifik
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Inclusions & Exclusions */}
        <div className="rounded-3xl bg-white border border-neutral-200/90 p-6 sm:p-8 lg:p-10 mb-14 shadow-xs">
          <div className="mb-8 text-center max-w-xl mx-auto">
            <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900 mb-2">
              Rincian Cakupan Layanan
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Ketahui dengan jelas apa saja yang dikerjakan oleh tukang kami agar ekspektasi hasil sesuai dengan kebutuhan hunian kamu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Yang Termasuk (Inclusions) */}
            <div className="rounded-2xl bg-emerald-50/50 border border-emerald-200/60 p-6">
              <div className="flex items-center gap-2 mb-4 text-emerald-800 font-semibold text-sm">
                <TickCircle size={20} className="text-emerald-600" variant="Bold" />
                <span>Yang Termasuk dalam Paket Ini</span>
              </div>

              <ul className="space-y-3">
                {(pkg.inclusions && pkg.inclusions.length > 0
                  ? pkg.inclusions
                  : [
                      "Penyelesaian pengerjaan sesuai standar SOP BuildMate",
                      "Peralatan kerja standar dibawa oleh mitra",
                      "Uji coba & pengecekan hasil bersama pelanggan",
                      "Pembersihan area kerja setelah pengerjaan selesai",
                    ]
                ).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-700">
                    <TickCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" variant="Bold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Yang Tidak Termasuk (Exclusions) */}
            <div className="rounded-2xl bg-neutral-50 border border-neutral-200/80 p-6">
              <div className="flex items-center gap-2 mb-4 text-neutral-700 font-semibold text-sm">
                <InfoCircle size={20} className="text-neutral-500" variant="Bold" />
                <span>Ketentuan Tambahan & Material</span>
              </div>

              <ul className="space-y-3">
                {(pkg.exclusions && pkg.exclusions.length > 0
                  ? pkg.exclusions
                  : [
                      "Material suku cadang/komponen baru disediakan mandiri oleh pelanggan",
                      "Pembongkaran struktur besar di luar ruang lingkup paket",
                      "Biaya parkir berbayar di gedung/apartemen pelanggan (jika ada)",
                    ]
                ).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-600">
                    <CloseCircle size={16} className="text-neutral-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Section: Cara Kerja Pemesanan (3 Langkah Mudah) */}
        <div className="mb-14">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900 mb-2">
              Cara Kerja Pemesanan di BuildMate
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Pengalaman perbaikan rumah bebas khawatir dalam 3 langkah mudah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 text-center shadow-xs">
              <div className="w-10 h-10 rounded-full bg-lavender-100 text-lavender-800 font-bold text-sm flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-sm text-neutral-900 mb-1">
                Atur Waktu & Alamat
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Pilih tanggal dan slot kedatangan yang kamu inginkan. Masukkan detail lokasi dengan tepat.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 text-center shadow-xs">
              <div className="w-10 h-10 rounded-full bg-lavender-100 text-lavender-800 font-bold text-sm flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-sm text-neutral-900 mb-1">
                Bayar Aman Rekening Bersama
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Pembayaran via Midtrans (QRIS/Transfer/VA). Uang kamu ditahan aman di sistem sampai pengerjaan beres.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 text-center shadow-xs">
              <div className="w-10 h-10 rounded-full bg-lavender-100 text-lavender-800 font-bold text-sm flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-sm text-neutral-900 mb-1">
                Tukang Datang & Bergaransi
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Mitra artisan datang tepat waktu, mengerjakan sesuai SOP, dan dilindungi garansi 14 hari penuh.
              </p>
            </div>
          </div>
        </div>

        {/* Section: Tukang Siap Bertugas Untuk Paket Ini (#tukang) */}
        <div id="tukang" className="mb-14 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900">
                Tukang Siap Mengerjakan Paket Ini
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Mitra profesional terdekat yang terverifikasi keahliannya untuk layanan ini.
              </p>
            </div>
            <Link
              href={`/search?category=${pkg.category_slug}&tab=workers`}
              className="text-xs font-semibold text-lavender-700 hover:text-lavender-800 hover:underline"
            >
              Lihat Semua Tukang ({pkg.worker_count || 8}) →
            </Link>
          </div>

          {availableWorkers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {availableWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="rounded-2xl bg-white border border-neutral-200/80 p-4 shadow-xs hover:border-lavender-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                        {worker.photo_path ? (
                          <img
                            src={worker.photo_path}
                            alt={worker.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-500">
                            {worker.full_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <h4 className="text-sm font-semibold text-neutral-900 truncate">
                            {worker.full_name}
                          </h4>
                          {worker.is_verified && (
                            <Verify size={14} className="text-lavender-600 shrink-0" variant="Bold" />
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 flex items-center gap-1 truncate">
                          <Location size={12} className="shrink-0" />
                          <span>{worker.service_area}</span>
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-600 line-clamp-2 mb-3">
                      {worker.bio || "Mitra berpengalaman dalam perbaikan dan renovasi hunian."}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-neutral-500 pb-3 border-b border-neutral-100">
                      <span>{worker.experience_years} thn pengalaman</span>
                      <span className="font-semibold text-neutral-800">
                        {worker.completed_jobs_count || 24} pesanan
                      </span>
                    </div>
                  </div>

                  <div className="pt-3">
                    <Link
                      href={`/order/${pkg.id}?worker=${worker.id}`}
                      className="w-full py-2 px-3 rounded-full bg-lavender-50 hover:bg-lavender-600 text-lavender-800 hover:text-white active:scale-95 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                    >
                      <span>Pilih Tukang Ini</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-neutral-50 border border-neutral-200 p-8 text-center text-xs text-neutral-500">
              Tukang akan ditugaskan secara otomatis sesuai area terdekat saat pemesanan.
            </div>
          )}
        </div>

        {/* Section: FAQ */}
        <div className="rounded-3xl bg-cream-50/80 border border-cream-200/80 p-6 sm:p-8">
          <h2 className="font-serif text-2xl text-neutral-900 mb-4 text-center">
            Pertanyaan Umum (FAQ)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-xs sm:text-sm">
            <div>
              <h4 className="font-semibold text-neutral-900 mb-1">
                Apakah material suku cadang sudah termasuk?
              </h4>
              <p className="text-neutral-600 leading-relaxed">
                Biaya paket adalah tarif jasa kerja standar. Suku cadang baru disediakan oleh pelanggan, atau mitra dapat membantu membelikan di toko material terdekat dengan struk resmi.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 mb-1">
                Bagaimana jika pengerjaan belum memuaskan?
              </h4>
              <p className="text-neutral-600 leading-relaxed">
                Dana kamu tetap tertahan di rekening bersama. Kamu berhak mengajukan komplain atau klaim garansi 14 hari untuk perbaikan ulang tanpa biaya ekstra.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 mb-1">
                Bisakah saya membatalkan pesanan?
              </h4>
              <p className="text-neutral-600 leading-relaxed">
                Pembatalan dapat dilakukan sebelum mitra berangkat ke lokasi dengan pengembalian dana penuh 100% langsung ke rekening kamu.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 mb-1">
                Apakah tukang membawa peralatan sendiri?
              </h4>
              <p className="text-neutral-600 leading-relaxed">
                Ya, seluruh mitra BuildMate telah dibekali toolset lengkap sesuai standar kategori pekerjaan masing-masing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar for Mobile Screen (<1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[10px] text-neutral-400 block uppercase font-medium">
            Tarif Paket
          </span>
          <span className="text-lg font-bold text-neutral-900">
            {formatRupiah(pkg.price)}
          </span>
        </div>
        <Link
          href={`/order/${pkg.id}`}
          className="py-2.5 px-6 rounded-full bg-lavender-600 hover:bg-lavender-700 active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
        >
          <span>Pesan Sekarang</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </CustomerShell>
  );
}

export default function ServiceDetailPage(props: PageProps) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-cream-50 flex items-center justify-center text-xs text-neutral-400">
          Memuat rincian paket layanan...
        </div>
      }
    >
      <ServiceDetailContent {...props} />
    </React.Suspense>
  );
}
