"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { AirbnbSearchBar } from "@/components/customer/AirbnbSearchBar";
import { AirbnbCategoryRibbon } from "@/components/customer/AirbnbCategoryRibbon";
import { FlamingoProductCard } from "@/components/customer/FlamingoProductCard";
import { EditorialDuoCards } from "@/components/customer/EditorialDuoCards";
import { EditorialQuote } from "@/components/customer/EditorialQuote";
import { WorkerCard } from "@/components/customer/WorkerCard";
import {
  ShieldTick,
  Verify,
  Camera,
  Crown1,
  ArrowRight,
  Clock,
  Sparkles,
  Award,
  Heart,
} from "@/lib/icons";
import { getCategories, getPackages } from "@/lib/data/services";
import { getWorkers } from "@/lib/data/workers";
import { Category, ServicePackage, Worker } from "@/lib/data/types";

// Curated high aesthetic still life photo map
const CURATED_PACKAGES_ROW_1 = [
  {
    id: "pkg-4",
    name: "Servis & Cuci AC Standard",
    categoryName: "Servis AC",
    categorySlug: "servis-ac",
    price: 75000,
    durationMinutes: 60,
    imageUrl:
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80",
    badge: "PALING DICARI",
    description: "Pembersihan indoor & outdoor unit, filter, cek tekanan freon dan drainase air.",
  },
  {
    id: "pkg-1",
    name: "Ganti Keran & Deteksi Pipa",
    categoryName: "Plumbing",
    categorySlug: "plumbing",
    price: 120000,
    durationMinutes: 45,
    imageUrl:
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=80",
    badge: "RESPON CEPAT",
    description: "Perbaikan keran dol, bocor rembes, dan penggantian seal pipa bertekanan.",
  },
  {
    id: "pkg-3",
    name: "Instalasi & Peremajaan Listrik",
    categoryName: "Kelistrikan",
    categorySlug: "perbaikan-umum",
    price: 150000,
    durationMinutes: 90,
    imageUrl:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80",
    badge: "BERGARANSI",
    description: "Pengecekan jalur MCB, penggantian stop kontak gosong, dan instalasi fitting aman.",
  },
  {
    id: "pkg-2",
    name: "Pengecatan Ulang Dinding Kamar",
    categoryName: "Pengecatan",
    categorySlug: "pengecatan",
    price: 180000,
    durationMinutes: 180,
    imageUrl:
      "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&auto=format&fit=crop&q=80",
    badge: "STANDAR ARTISAN",
    description: "Pembersihan jamur dinding, plamir dasar halus, dan 2 lapis cat merata rapi.",
  },
];

const CURATED_PACKAGES_ROW_2 = [
  {
    id: "pkg-5",
    name: "Perbaikan Atap Rembes & Bocor",
    categoryName: "Atap & Bocor",
    categorySlug: "perbaikan-umum",
    price: 200000,
    durationMinutes: 120,
    imageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80",
    badge: "TAHAN HUJAN",
    description: "Pelapisan membrane waterproofing pada talang seng dan sambungan genteng pecah.",
  },
  {
    id: "pkg-6",
    name: "Servis Engsel & Kunci Pintu Seret",
    categoryName: "Pintu & Kunci",
    categorySlug: "perbaikan-umum",
    price: 95000,
    durationMinutes: 45,
    imageUrl:
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80",
    badge: "PRESISI",
    description: "Penyetelan kedudukan kusen kayu, pelumasan bearing engsel, dan ganti silinder kunci.",
  },
  {
    id: "pkg-7",
    name: "Kuras & Pembersihan Tangki Toren",
    categoryName: "Plumbing",
    categorySlug: "plumbing",
    price: 130000,
    durationMinutes: 75,
    imageUrl:
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80",
    badge: "HIGIENIS",
    description: "Pengurasan endapan lumut dasar toren, sikat dinding tangki, dan desinfeksi aman.",
  },
  {
    id: "pkg-8",
    name: "Peremajaan Saklar & Stop Kontak",
    categoryName: "Kelistrikan",
    categorySlug: "perbaikan-umum",
    price: 85000,
    durationMinutes: 40,
    imageUrl:
      "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80",
    badge: "SAFETY CHECK",
    description: "Penggantian unit saklar standar SNI dengan pengencangan kabel anti-sparking.",
  },
];

// Editorial Journal / Stories (Bottom 4 cards)
const EDITORIAL_JOURNAL_STORIES = [
  {
    title: "Merawat AC Inverter Agar Tetap Dingin & Hemat Listrik",
    tag: "PANDUAN PRAKTIS",
    readTime: "4 mnt baca",
    imageUrl:
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80",
    href: "/search?q=ac",
  },
  {
    title: "Mendeteksi Kebocoran Pipa Sebelum Merusak Dinding Rumah",
    tag: "DIAGNOSA RUMAH",
    readTime: "5 mnt baca",
    imageUrl:
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=80",
    href: "/search?q=pipa",
  },
  {
    title: "Kisah Pak Budi: 15 Tahun Merawat Hunian Keluarga Surabaya",
    tag: "CERITA MITRA",
    readTime: "6 mnt baca",
    imageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
    href: "/workers/budi-santoso",
  },
  {
    title: "5 Aturan Keselamatan Listrik Rumah Tangga yang Wajib Diketahui",
    tag: "KEAMANAN HUNIAN",
    readTime: "3 mnt baca",
    imageUrl:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80",
    href: "/search?q=listrik",
  },
];

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("all");

  useEffect(() => {
    getCategories().then((cats) => setCategories(cats.filter((c) => c.is_active)));
    getWorkers({ tab: "active" }).then((wks) => setWorkers(wks.slice(0, 4)));
  }, []);

  return (
    <CustomerShell>
      {/* 1. HERO STAGE: FLAMINGO ESTATE WARM PHOTOGRAPHY + AIRBNB FLOATING CAPSULE SEARCH */}
      <section className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="max-w-[1240px] mx-auto">
          {/* Hero Photography Container */}
          <div className="relative rounded-[28px] sm:rounded-[36px] overflow-hidden bg-[#1E1B26] min-h-[480px] sm:min-h-[540px] flex flex-col justify-between p-6 sm:p-12 lg:p-16 text-white shadow-sm border border-neutral-800/40">
            {/* Background Still Life Workshop Image with Natural Organic Lighting */}
            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&auto=format&fit=crop&q=80"
              alt="BuildMate Workshop Artisan Still Life"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-30 scale-105 transition-transform duration-1000"
            />
            {/* Subtle Gradient Veil */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#15121E] via-[#1B1824]/60 to-transparent" />

            {/* Top Minimal Editorial Badge */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold tracking-wider uppercase text-lavender-200 border border-white/15">
                <Crown1 size={14} className="text-lavender-300" variant="Bold" />
                <span>Standar Artisan & Rekber Surabaya</span>
              </span>

              <span className="hidden sm:inline-block text-xs text-neutral-300 font-serif italic tracking-wider">
                Edisi Perbaikan Hunian 2026
              </span>
            </div>

            {/* Center Editorial Headlines */}
            <div className="relative z-10 max-w-3xl my-auto py-6 sm:py-8 text-center sm:text-left">
              <p className="text-xs uppercase tracking-[0.25em] text-lavender-300 mb-2 font-medium">
                KUALITAS TERJAMIN · BAYAR AMAN
              </p>
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-[62px] text-white leading-[1.08] tracking-tight">
                Tukang yang <span className="italic text-lavender-300 font-normal">tepat</span>, saat hunian membutuhkan.
              </h1>
              <p className="text-xs sm:text-sm text-neutral-300 mt-3 sm:mt-4 leading-relaxed max-w-xl font-normal">
                Pilih tukang terverifikasi di Surabaya dengan tarif paket pasti. Pembayaran diamankan di rekening bersama platform dan baru dicairkan setelah kamu puas dengan foto hasil kerja.
              </p>
            </div>

            {/* Bottom 3 Trust Bullets */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-8 text-xs text-neutral-200 font-medium">
              <div className="flex items-center gap-2">
                <ShieldTick size={16} variant="Bulk" className="text-lavender-300" />
                <span>Rekber Midtrans Escrow</span>
              </div>
              <div className="flex items-center gap-2">
                <Verify size={16} variant="Bulk" className="text-lavender-300" />
                <span>100% Tukang Terverifikasi</span>
              </div>
              <div className="flex items-center gap-2">
                <Camera size={16} variant="Bulk" className="text-lavender-300" />
                <span>Bukti Foto Sebelum & Sesudah</span>
              </div>
            </div>
          </div>

          {/* Airbnb Floating Capsule Search Bar (Overlapping Hero Base) */}
          <div className="-mt-8 sm:-mt-9 relative z-20 px-3">
            <AirbnbSearchBar />
          </div>
        </div>
      </section>

      {/* 2. AIRBNB HORIZONTAL CATEGORY RIBBON */}
      <section className="pt-10 sm:pt-14 pb-2 border-b border-cream-200/80">
        <AirbnbCategoryRibbon
          categories={categories}
          selectedSlug={selectedCategorySlug}
          onSelect={(slug) => setSelectedCategorySlug(slug)}
        />
      </section>

      {/* 3. FLAMINGO ESTATE ROW 1: "PILIHAN TERKURASI" (4-COLUMN PRODUCT GRID) */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-1.5">
            PILIHAN TERKURASI · SURABAYA
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 tracking-tight">
            Paket Perbaikan Paling Dibutuhkan
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-2 leading-relaxed">
            Pilihan solusi harian dengan tarif transparan tanpa biaya siluman. Lengkap dengan estimasi waktu dan garansi pengerjaan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CURATED_PACKAGES_ROW_1.map((pkg) => (
            <FlamingoProductCard key={pkg.id} {...pkg} />
          ))}
        </div>
      </section>

      {/* 4. FLAMINGO ESTATE SIGNATURE: EDITORIAL DUO CARDS #1 */}
      {/* Inspired by the screenshot's top duo: "New Jurassic Vanilla Candle" & "Pleasure Principles" */}
      <EditorialDuoCards
        cardLeft={{
          tag: "STANDAR TUKANG",
          title: "Kurasi Ketat",
          italicTitle: "Mitra Ahli",
          description:
            "Setiap mitra melalui kurasi 5 tahap: verifikasi identitas fisik, uji keahlian teknis, rekam jejak kerja, dan kepatuhan SOP kebersihan hunian pelanggan.",
          imageUrl:
            "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&auto=format&fit=crop&q=80",
          imageAlt: "Teknisi ahli memeriksa peralatan dengan presisi",
          ctaText: "Kenali Standar Mitra",
          ctaHref: "/search?tab=workers",
        }}
        cardRight={{
          tag: "PROTEKSI DANA",
          title: "Ketenangan",
          italicTitle: "Rekening Bersama",
          description:
            "Uang pembayaranmu aman di platform. Dana baru kami cairkan ke tukang setelah kamu memeriksa foto hasil kerja dan menyetujuinya tanpa rasa ragu.",
          imageUrl:
            "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&auto=format&fit=crop&q=80",
          imageAlt: "Hunian bersih dan tenang diterangi cahaya alami",
          ctaText: "Pelajari Alur Rekber",
          ctaHref: "/#cara-kerja",
        }}
      />

      {/* 5. FLAMINGO ESTATE ROW 2: "KOLEKSI PERBAIKAN POPULER" (4-COLUMN GRID) */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-end justify-between mb-8 sm:mb-10">
          <div>
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-1">
              KATALOG REKOMENDASI
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 tracking-tight">
              Solusi Tepat untuk Setiap Sudut Hunian
            </h2>
          </div>
          <Link
            href="/search"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 hover:text-lavender-700 transition-colors uppercase tracking-wider"
          >
            <span>Semua Paket</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CURATED_PACKAGES_ROW_2.map((pkg) => (
            <FlamingoProductCard key={pkg.id} {...pkg} />
          ))}
        </div>
      </section>

      {/* 6. FLAMINGO ESTATE EDITORIAL MANIFESTO QUOTE (CENTERPIECE STATEMENTS & PRESS/TRUST HALLMARKS) */}
      {/* Inspired by the screenshot's centered quote block & press logos */}
      <EditorialQuote
        attribution="KOMITMEN KUALITAS BUILDMATE · SURABAYA"
        quote="Rumah bukan sekadar bangunan fisik, melainkan tempat di mana rasa tenang bermula. Kami memastikan setiap pengerjaan ditangani oleh tangan ahli yang terampil, jujur, dan berdedikasi."
      />

      {/* 7. FLAMINGO ESTATE SIGNATURE: EDITORIAL DUO CARDS #2 */}
      {/* Inspired by the screenshot's second duo: "Saved by Sage" & "Ripe for the Pluck" */}
      <EditorialDuoCards
        cardLeft={{
          tag: "TRANSPARANSI",
          title: "Harga Pasti",
          italicTitle: "Tanpa Biaya Siluman",
          description:
            "Cakupan pekerjaan dicatat jelas di awal pemesanan. Tukang tidak diperkenankan meminta biaya tambahan mendadak di luar kesepakatan tertulis di aplikasi.",
          imageUrl:
            "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80",
          imageAlt: "Material pengerjaan dan peralatan tertata rapi",
          ctaText: "Lihat Rincian Biaya",
          ctaHref: "/search",
        }}
        cardRight={{
          tag: "VERIFIKASI VISUAL",
          title: "Bukti Foto",
          italicTitle: "Sebelum & Sesudah",
          description:
            "Mitra wajib mendokumentasikan kondisi masalah sebelum mulai dan hasil akhir perbaikan. Periksa bukti visual langsung di layar sebelum kamu klik konfirmasi selesai.",
          imageUrl:
            "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=1200&auto=format&fit=crop&q=80",
          imageAlt: "Hasil perbaikan keran bersih mengkilap tanpa noda",
          ctaText: "Simulasi Pelacakan",
          ctaHref: "/orders",
        }}
      />

      {/* 8. MITRA PILIHAN SURABAYA (AIRBNB HOST CARD & FLAMINGO REFINED STYLING) */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="flex items-end justify-between mb-8 sm:mb-10">
          <div>
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-1">
              MITRA TERVERIFIKASI
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 tracking-tight">
              Tukang Ahli dengan Dedikasi Nyata
            </h2>
          </div>
          <Link
            href="/search?tab=workers"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 hover:text-lavender-700 transition-colors uppercase tracking-wider"
          >
            <span>Semua Tukang</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {workers.map((worker) => (
            <WorkerCard
              key={worker.id}
              id={worker.id}
              slug={worker.slug}
              fullName={worker.full_name}
              photoPath={worker.photo_path}
              serviceArea={worker.service_area}
              isVerified={worker.is_verified}
              completedJobsCount={worker.completed_jobs_count}
              experienceYears={worker.experience_years}
              categoryName={worker.service_area.includes("Selatan") ? "Plumbing" : "Perbaikan"}
              startingPrice={150000}
            />
          ))}
        </div>
      </section>

      {/* 9. THE AMBIENT FEATURE BANNER: "THE BUILDMATE SHIELD" */}
      {/* Inspired by the screenshot's full-width landscape "The Flamingo Fund" banner */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
        <div className="relative rounded-[32px] sm:rounded-[40px] overflow-hidden bg-neutral-900 min-h-[380px] sm:min-h-[460px] flex flex-col justify-center items-center text-center p-8 sm:p-14 text-white shadow-md">
          {/* Natural Lush Light Terrace Landscape */}
          <img
            src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1800&auto=format&fit=crop&q=80"
            alt="BuildMate Ambient Terrace"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-40 scale-105"
          />
          {/* Subtle warm tint overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-neutral-900/40 to-neutral-900/60" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-lavender-300">
              MEMBERSHIP EKSKLUSIF
            </p>
            <h3 className="font-serif text-3xl sm:text-5xl text-white tracking-tight leading-tight">
              The BuildMate Shield
            </h3>
            <p className="font-serif italic text-lg sm:text-xl text-neutral-200">
              Ketenangan Hunian Sepanjang Tahun
            </p>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-lg mx-auto leading-relaxed font-normal">
              Bebas biaya layanan untuk setiap pesanan perbaikan, jaminan garansi pengerjaan ulang 14 hari, dan prioritas penugasan tukang hanya Rp49.000 / bulan.
            </p>

            <div className="pt-4">
              <Link
                href="/plus"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-white text-neutral-900 hover:bg-neutral-100 active:scale-95 text-xs font-semibold tracking-wider uppercase transition-all shadow-md"
              >
                Bergabung ke BuildMate Plus
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 10. CARA KERJA (01 02 03 MAGAZINE STYLE) */}
      <section id="cara-kerja" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="bg-[#FAF8F5] rounded-[32px] p-8 sm:p-14 border border-[#EBE7DF]">
          <div className="text-center max-w-lg mx-auto mb-12">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-1">
              CARA KERJA
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 tracking-tight">
              Tiga Langkah Tanpa Rasa Khawatir
            </h2>
            <p className="text-xs text-neutral-500 mt-2">
              Kepastian transaksi dan transparansi penuh dari awal pemesanan hingga selesai.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 relative">
            {/* Step 1 */}
            <div className="space-y-3">
              <span className="font-serif text-5xl sm:text-6xl text-lavender-400 block font-normal">
                01
              </span>
              <h3 className="font-semibold text-neutral-900 text-sm">
                Pilih Layanan & Wilayahmu
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                Pilih paket perbaikan dengan harga pasti di kecamatannmu di Surabaya. Tentukan tanggal dan slot waktu kedatangan tukang.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <span className="font-serif text-5xl sm:text-6xl text-lavender-400 block font-normal">
                02
              </span>
              <h3 className="font-semibold text-neutral-900 text-sm">
                Bayar Aman ke Rekber Escrow
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                Bayar melalui QRIS, GoPay, atau Virtual Account. Uangmu ditahan aman oleh sistem platform selama proses pengerjaan berjalan.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-3">
              <span className="font-serif text-5xl sm:text-6xl text-lavender-400 block font-normal">
                03
              </span>
              <h3 className="font-semibold text-neutral-900 text-sm">
                Periksa Foto & Konfirmasi Selesai
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                Tukang mengunggah foto sebelum dan sesudah. Cek hasil pengerjaan, lalu konfirmasi selesai agar dana diteruskan ke mitra.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FLAMINGO ESTATE STORIES / EDITORIAL JOURNAL */}
      {/* Inspired by the screenshot's 4-card recipe/story row at the bottom ("Recipes & Stories") */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="text-center max-w-xl mx-auto mb-10">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-1">
            CATATAN RUMAH & PERAWATAN
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 tracking-tight">
            Panduan Menjaga Hunian Tetap Prima
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {EDITORIAL_JOURNAL_STORIES.map((story, idx) => (
            <Link
              key={idx}
              href={story.href}
              className="group block text-left rounded-[22px] bg-[#FAF8F5] border border-[#EBE7DF] p-4 hover:border-lavender-400 hover:shadow-md transition-all duration-300"
            >
              <div className="aspect-[4/3] rounded-[16px] overflow-hidden bg-neutral-100 mb-3.5 border border-[#E5E0D5]">
                <img
                  src={story.imageUrl}
                  alt={story.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase tracking-wider mb-1 font-semibold">
                <span>{story.tag}</span>
                <span>{story.readTime}</span>
              </div>
              <h4 className="font-serif text-[18px] text-neutral-900 leading-snug tracking-tight group-hover:text-lavender-700 transition-colors">
                {story.title}
              </h4>
            </Link>
          ))}
        </div>
      </section>

      {/* 12. PITA CTA MITRA (DEEP FOREST / OBSIDIAN RIBBON) */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-[28px] bg-[#1E241E] text-white p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left border border-neutral-800">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-widest text-emerald-300 uppercase">
              BERGABUNG DENGAN KOMUNITAS MITRA
            </p>
            <h4 className="font-serif text-2xl sm:text-3xl text-white">
              Kamu tukang berpengalaman di Surabaya?
            </h4>
            <p className="text-xs text-neutral-300 max-w-lg leading-relaxed font-normal">
              Dapatkan pesanan pekerjaan teratur tanpa potongan sepihak, sistem escrow aman, dan pencairan dana langsung setiap pekerjaan selesai.
            </p>
          </div>
          <Link
            href="/mitra/register"
            className="px-6 py-3 rounded-full bg-white text-neutral-900 hover:bg-neutral-100 active:scale-95 text-xs font-semibold tracking-wider uppercase transition-all shrink-0 shadow-sm"
          >
            Daftar Sebagai Mitra Tukang
          </Link>
        </div>
      </section>
    </CustomerShell>
  );
}
