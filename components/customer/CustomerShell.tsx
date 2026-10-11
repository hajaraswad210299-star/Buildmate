"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home2,
  SearchNormal1,
  ReceiptText,
  ProfileCircle,
  Crown1,
  ArrowLeft2,
  LogoutCurve,
  User,
  CloseCircle,
  WhatsappIcon,
} from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";

interface CustomerShellProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  backHref?: string;
  hideBottomNav?: boolean;
  hideWaButton?: boolean;
  rightAction?: React.ReactNode;
}

export function CustomerShell({
  children,
  title,
  showBack = false,
  backHref,
  hideBottomNav = false,
  hideWaButton = false,
  rightAction,
}: CustomerShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<{
    full_name?: string;
    avatar_url?: string;
    is_plus?: boolean;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeOrdersCount, setActiveOrdersCount] = useState(1); // default active orders demo badge

  useEffect(() => {
    // Check announcement bar dismissed state
    const dismissed = localStorage.getItem("bm_plus_banner_dismissed");
    if (dismissed === "true") {
      setShowAnnouncement(false);
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Fetch customer auth state
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      }
    });
  }, []);

  const handleDismissAnnouncement = () => {
    setShowAnnouncement(false);
    localStorage.setItem("bm_plus_banner_dismissed", "true");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const isHome = pathname === "/";
  const isSearch = pathname.startsWith("/search");
  const isOrders = pathname.startsWith("/orders");
  const isAccount = pathname.startsWith("/account");
  const isPlus = pathname.startsWith("/plus");

  return (
    <div className="min-h-screen bg-cream-50 text-neutral-900 flex flex-col font-sans selection:bg-lavender-200 selection:text-lavender-900">
      {/* 1. Thin Announcement Bar (Flamingo Estate pattern A2 & A3) */}
      {showAnnouncement && !profile?.is_plus && (
        <div className="bg-lavender-800 text-white text-[13px] py-2 px-6 flex items-center justify-between text-center relative z-40 transition-colors">
          <div className="flex-1 text-center font-medium">
            <Link
              href="/plus"
              className="hover:underline inline-flex items-center gap-1.5 transition-opacity hover:opacity-90"
            >
              <Crown1 size={15} className="text-lavender-300" variant="Bold" />
              <span>BuildMate Plus — bebas biaya layanan & garansi pengerjaan ulang</span>
              <span className="text-lavender-300 ml-1">→</span>
            </Link>
          </div>
          <button
            onClick={handleDismissAnnouncement}
            className="text-lavender-300 hover:text-white p-1 rounded-full transition-colors ml-2"
            aria-label="Tutup pengumuman"
          >
            <CloseCircle size={16} />
          </button>
        </div>
      )}

      {/* 2. Top Header (Desktop Navbar 72px / Mobile Top App Bar 56px) */}
      <header
        className={`sticky top-0 z-30 transition-all duration-200 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs"
            : isHome
            ? "bg-cream-50/90 backdrop-blur-sm"
            : "bg-white border-b border-neutral-200/80"
        }`}
      >
        <div className="w-full px-6">
          {/* Desktop Nav (≥1024px) */}
          <div className="hidden lg:flex items-center justify-between h-[72px]">
            {/* Left Menu Links */}
            <nav className="flex items-center gap-7 text-[14px] font-medium text-neutral-700">
              <Link
                href="/search"
                className={`hover:text-lavender-700 transition-colors ${
                  isSearch ? "text-lavender-600 font-semibold" : ""
                }`}
              >
                Cari Layanan
              </Link>
              <Link
                href="/#cara-kerja"
                className="hover:text-lavender-700 transition-colors"
              >
                Cara Kerja
              </Link>
              <Link
                href="/plus"
                className={`inline-flex items-center gap-1.5 hover:text-lavender-700 transition-colors ${
                  isPlus ? "text-lavender-600 font-semibold" : ""
                }`}
              >
                <Crown1 size={16} className="text-lavender-600" />
                <span>BuildMate Plus</span>
              </Link>
              <Link
                href="/mitra/register"
                className="text-neutral-500 hover:text-neutral-900 transition-colors text-xs"
              >
                Jadi Mitra
              </Link>
            </nav>

            {/* Center Wordmark (Instrument Serif 28px) */}
            <div className="absolute left-1/2 -translate-x-1/2 text-center">
              <Link
                href="/"
                className="font-serif text-[28px] text-neutral-900 tracking-tight hover:opacity-90 transition-opacity"
              >
                BuildMate
              </Link>
            </div>

            {/* Right Profile & Actions */}
            <div className="flex items-center gap-4">
              {user && (
                <Link
                  href="/orders"
                  className={`relative px-3 py-2 rounded-xl text-[14px] font-medium hover:text-lavender-700 hover:bg-neutral-100 transition-colors ${
                    isOrders ? "text-lavender-600 font-semibold bg-lavender-50" : "text-neutral-700"
                  }`}
                >
                  <span>Pesanan</span>
                  {activeOrdersCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-lavender-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {activeOrdersCount}
                    </span>
                  )}
                </Link>
              )}

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full border border-neutral-200 hover:border-neutral-300 hover:shadow-xs transition-all bg-white"
                    aria-label="Menu akun"
                  >
                    <div className="w-8 h-8 rounded-full bg-lavender-100 text-lavender-700 font-semibold text-xs flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {profile?.full_name
                            ? profile.full_name.charAt(0).toUpperCase()
                            : "U"}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-neutral-200 shadow-md py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b border-neutral-100">
                        <p className="text-xs text-neutral-400">Masuk sebagai</p>
                        <p className="text-sm font-semibold text-neutral-900 truncate">
                          {profile?.full_name || user.email}
                        </p>
                      </div>
                      <Link
                        href="/account"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        <User size={16} />
                        <span>Profil & Akun</span>
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        <ReceiptText size={16} />
                        <span>Pesanan Saya</span>
                      </Link>
                      <Link
                        href="/plus"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-lavender-700 font-medium hover:bg-lavender-50 transition-colors"
                      >
                        <Crown1 size={16} />
                        <span>BuildMate Plus</span>
                      </Link>
                      <div className="border-t border-neutral-100 my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs text-danger-700 hover:bg-danger-50 transition-colors"
                      >
                        <LogoutCurve size={16} />
                        <span>Keluar</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-700 hover:text-neutral-900 transition-colors"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/register"
                    className="px-5 py-2.5 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    Daftar
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Top App Bar (<1024px, 56px) */}
          <div className="flex lg:hidden items-center justify-between h-14">
            {isHome ? (
              <>
                <Link
                  href="/search"
                  className="p-2 -ml-2 text-neutral-700 hover:text-neutral-900"
                  aria-label="Cari tukang"
                >
                  <SearchNormal1 size={22} />
                </Link>

                <Link
                  href="/"
                  className="font-serif text-[24px] text-neutral-900 tracking-tight"
                >
                  BuildMate
                </Link>

                <div>
                  {user ? (
                    <Link
                      href="/account"
                      className="w-8 h-8 rounded-full bg-lavender-100 text-lavender-700 font-semibold text-xs flex items-center justify-center overflow-hidden border border-neutral-200"
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Profil"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {profile?.full_name
                            ? profile.full_name.charAt(0).toUpperCase()
                            : "U"}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      className="text-xs font-semibold text-lavender-700 px-3 py-1.5 rounded-full border border-lavender-300 bg-lavender-50"
                    >
                      Masuk
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {showBack ? (
                    <Link
                      href={backHref || "/"}
                      className="p-2 -ml-2 text-neutral-700 hover:text-neutral-900"
                      aria-label="Kembali"
                    >
                      <ArrowLeft2 size={20} />
                    </Link>
                  ) : (
                    <button
                      onClick={() => router.back()}
                      className="p-2 -ml-2 text-neutral-700 hover:text-neutral-900"
                      aria-label="Kembali"
                    >
                      <ArrowLeft2 size={20} />
                    </button>
                  )}
                  <h1 className="text-base font-semibold text-neutral-900 line-clamp-1">
                    {title || "BuildMate"}
                  </h1>
                </div>

                {rightAction ? (
                  <div>{rightAction}</div>
                ) : (
                  <Link
                    href="/search"
                    className="p-2 text-neutral-700"
                    aria-label="Cari"
                  >
                    <SearchNormal1 size={20} />
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>

      {/* Floating WhatsApp Help Button (Flamingo pattern, unless hidden) */}
      {!hideWaButton && (
        <aside
          aria-label="Bantuan WhatsApp"
          className={`fixed right-4 sm:right-6 z-30 transition-all ${
            hideBottomNav ? "bottom-24" : "bottom-20 lg:bottom-8"
          }`}
        >
          <a
            href="https://wa.me/6281200000000?text=Halo%20BuildMate,%20saya%20butuh%20bantuan%20pesanan"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-transform hover:scale-105 active:scale-95"
            aria-label="Hubungi BuildMate via WhatsApp"
          >
            <WhatsappIcon size={18} color="#FFFFFF" />
            <span className="hidden sm:inline">Hubungi BuildMate</span>
          </a>
        </aside>
      )}

      {/* 3. Mobile Bottom Nav (64px + safe area, A3) */}
      {!hideBottomNav && (
        <nav
          aria-label="Navigasi Utama Pelanggan"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 pb-[env(safe-area-inset-bottom)] shadow-sm"
        >
          <div className={`grid ${user ? "grid-cols-4" : "grid-cols-3"} h-16 items-center px-2`}>
            {/* 1. Beranda */}
            <Link
              href="/"
              className="flex flex-col items-center justify-center gap-1 text-center py-1 transition-all"
            >
              <div
                className={`relative px-3 py-1 rounded-full transition-colors ${
                  isHome ? "bg-lavender-50 text-lavender-600" : "text-neutral-500"
                }`}
              >
                <Home2
                  size={22}
                  variant={isHome ? "Bold" : "Linear"}
                  className="transition-transform duration-200"
                />
              </div>
              <span
                className={`text-[11px] leading-none transition-colors ${
                  isHome ? "font-semibold text-lavender-700" : "text-neutral-500"
                }`}
              >
                Beranda
              </span>
            </Link>

            {/* 2. Cari */}
            <Link
              href="/search"
              className="flex flex-col items-center justify-center gap-1 text-center py-1 transition-all"
            >
              <div
                className={`relative px-3 py-1 rounded-full transition-colors ${
                  isSearch ? "bg-lavender-50 text-lavender-600" : "text-neutral-500"
                }`}
              >
                <SearchNormal1
                  size={22}
                  variant={isSearch ? "Bold" : "Linear"}
                  className="transition-transform duration-200"
                />
              </div>
              <span
                className={`text-[11px] leading-none transition-colors ${
                  isSearch ? "font-semibold text-lavender-700" : "text-neutral-500"
                }`}
              >
                Cari
              </span>
            </Link>

            {/* 3. Pesanan (hanya jika sudah login) */}
            {user && (
              <Link
                href="/orders"
                className="flex flex-col items-center justify-center gap-1 text-center py-1 transition-all relative"
              >
                <div
                  className={`relative px-3 py-1 rounded-full transition-colors ${
                    isOrders ? "bg-lavender-50 text-lavender-600" : "text-neutral-500"
                  }`}
                >
                  <ReceiptText
                    size={22}
                    variant={isOrders ? "Bold" : "Linear"}
                    className="transition-transform duration-200"
                  />
                  {activeOrdersCount > 0 && (
                    <span className="absolute top-0 right-1 min-w-[14px] h-[14px] bg-lavender-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                      {activeOrdersCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] leading-none transition-colors ${
                    isOrders ? "font-semibold text-lavender-700" : "text-neutral-500"
                  }`}
                >
                  Pesanan
                </span>
              </Link>
            )}

            {/* 4. Akun */}
            <Link
              href="/account"
              className="flex flex-col items-center justify-center gap-1 text-center py-1 transition-all"
            >
              <div
                className={`relative px-3 py-1 rounded-full transition-colors ${
                  isAccount ? "bg-lavender-50 text-lavender-600" : "text-neutral-500"
                }`}
              >
                <ProfileCircle
                  size={22}
                  variant={isAccount ? "Bold" : "Linear"}
                  className="transition-transform duration-200"
                />
              </div>
              <span
                className={`text-[11px] leading-none transition-colors ${
                  isAccount ? "font-semibold text-lavender-700" : "text-neutral-500"
                }`}
              >
                Akun
              </span>
            </Link>
          </div>
        </nav>
      )}

      {/* 4. Desktop Footer (lavender-900, Instrument Serif titles, A2 & A3) */}
      <footer className="hidden lg:block bg-lavender-900 text-lavender-100 pt-16 pb-12 mt-20 border-t border-lavender-800">
        <div className="w-full px-6">
          <div className="grid grid-cols-4 gap-12 mb-16">
            {/* Col 1: Brand */}
            <div>
              <h3 className="font-serif text-2xl text-white tracking-tight mb-4">
                BuildMate
              </h3>
              <p className="text-xs text-lavender-200 leading-relaxed mb-4">
                Marketplace jasa tukang untuk perbaikan rumah ringan dengan jaminan harga pasti, bayar aman lewat rekening bersama, dan tukang terverifikasi.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-lavender-800/80 text-[11px] text-lavender-200 border border-lavender-700/60">
                <Crown1 size={14} className="text-lavender-300" />
                <span>Simulasi SaaS — Midtrans Sandbox</span>
              </div>
            </div>

            {/* Col 2: Layanan */}
            <div>
              <h4 className="font-serif text-lg text-white mb-4">Layanan Populer</h4>
              <ul className="space-y-2.5 text-xs text-lavender-200">
                <li>
                  <Link href="/search?category=plumbing" className="hover:text-white transition-colors">
                    Plumbing & Keran Bocor
                  </Link>
                </li>
                <li>
                  <Link href="/search?category=pengecatan" className="hover:text-white transition-colors">
                    Pengecatan Dinding Kamar
                  </Link>
                </li>
                <li>
                  <Link href="/search?category=perbaikan-umum" className="hover:text-white transition-colors">
                    Perbaikan Engsel & Pintu
                  </Link>
                </li>
                <li>
                  <Link href="/search?category=servis-ac" className="hover:text-white transition-colors">
                    Servis & Cuci AC Ringan
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Bantuan */}
            <div>
              <h4 className="font-serif text-lg text-white mb-4">Bantuan & Panduan</h4>
              <ul className="space-y-2.5 text-xs text-lavender-200">
                <li>
                  <Link href="/#cara-kerja" className="hover:text-white transition-colors">
                    Cara Kerja & Rekening Bersama
                  </Link>
                </li>
                <li>
                  <Link href="/plus" className="hover:text-white transition-colors">
                    BuildMate Plus & Garansi
                  </Link>
                </li>
                <li>
                  <a
                    href="https://wa.me/6281200000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <WhatsappIcon size={14} color="#AC97FB" />
                    <span>WhatsApp Bantuan</span>
                  </a>
                </li>
                <li>
                  <Link href="/admin" className="hover:text-white transition-colors">
                    Ruang Kendali Admin
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Kemitraan */}
            <div>
              <h4 className="font-serif text-lg text-white mb-4">Mitra Tukang</h4>
              <p className="text-xs text-lavender-200 leading-relaxed mb-4">
                Punya keahlian tukang bangunan? Bergabunglah sebagai Mitra BuildMate dan dapatkan order pekerjaan pasti di wilayahmu.
              </p>
              <Link
                href="/mitra/register"
                className="inline-block px-4 py-2 rounded-full bg-white text-lavender-900 hover:bg-lavender-50 text-xs font-semibold transition-colors"
              >
                Daftar Sebagai Mitra
              </Link>
            </div>
          </div>

          {/* Centered Crest Seal in Flamingo Estate Style with BuildMate Icon SVG */}
          <div className="pt-10 pb-8 flex flex-col items-center justify-center text-center border-t border-lavender-800/60 font-sans">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm mb-3.5 border border-white/20 flex items-center justify-center bg-white/5">
              <img
                src="/icon.svg"
                alt="BuildMate Icon"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="font-sans tracking-[0.25em] text-xs text-white uppercase font-semibold">
              BUILDMATE
            </p>
            <p className="text-[11px] text-lavender-300 tracking-wider mt-1 uppercase font-sans">
              Standar Integritas & Ketenangan Hunian
            </p>
          </div>

          {/* Bottom Row */}
          <div className="pt-6 border-t border-lavender-800/80 flex items-center justify-between text-xs text-lavender-300">
            <p>© 2026 BuildMate SaaS Solo Challenge. Seluruh hak cipta dilindungi.</p>
            <div className="flex items-center gap-6">
              <span>Bahasa Indonesia · Rupiah (IDR)</span>
              <span>Pembayaran Midtrans Sandbox</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
