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
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes("email_change") || search.includes("type=email_change")) {
        window.location.href = "/admin/settings?verified=email";
        return;
      }
    }

    // Fetch customer auth state
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        const metaAvatar =
          user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
        const metaName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "";

        supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setProfile({
                full_name: data.full_name || metaName,
                avatar_url: data.avatar_url || metaAvatar,
              });
            } else {
              setProfile({
                full_name: metaName,
                avatar_url: metaAvatar,
              });
            }
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
        <div className="w-full px-6 lg:px-[70px]">
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
                          referrerPolicy="no-referrer"
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
                          referrerPolicy="no-referrer"
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

      {/* 4. Desktop Footer (lavender-900, Flamingo Estate Centered Concept & Instrument Serif titles) */}
      <footer className="hidden lg:block bg-lavender-900 text-lavender-100 pt-16 pb-12 mt-20 border-t border-lavender-800">
        <div className="max-w-5xl mx-auto px-6">
          {/* 5 Centered Columns (Matching Flamingo Estate layout: Shop, Category, The Estate, Help, Get The Dirt) */}
          <div className="grid grid-cols-5 gap-8 lg:gap-10 xl:gap-12 mb-16">
            {/* Col 1: Layanan (Shop) */}
            <div>
              <h4 className="font-serif text-[17px] text-white mb-4 font-normal">
                Layanan
              </h4>
              <ul className="space-y-2 text-[13px] text-lavender-200/90 font-sans">
                <li>
                  <Link href="/search?category=servis-ac" className="hover:text-white transition-colors">
                    Servis & Cuci AC
                  </Link>
                </li>
                <li>
                  <Link href="/search?category=plumbing" className="hover:text-white transition-colors">
                    Plumbing & Keran Bocor
                  </Link>
                </li>
                <li>
                  <Link href="/search?category=pengecatan" className="hover:text-white transition-colors">
                    Pengecatan Dinding
                  </Link>
                </li>
                <li>
                  <Link href="/search?category=perbaikan-umum" className="hover:text-white transition-colors">
                    Perbaikan Pintu & Kunci
                  </Link>
                </li>
                <li>
                  <Link href="/search?category=atap" className="hover:text-white transition-colors">
                    Atap & Waterproofing
                  </Link>
                </li>
                <li>
                  <Link href="/search?category=listrik" className="hover:text-white transition-colors">
                    Kelistrikan Rumah
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 2: Kategori (Category) */}
            <div>
              <h4 className="font-serif text-[17px] text-white mb-4 font-normal">
                Kategori
              </h4>
              <ul className="space-y-2 text-[13px] text-lavender-200/90 font-sans">
                <li>
                  <Link href="/search" className="hover:text-white transition-colors">
                    Perbaikan Interior
                  </Link>
                </li>
                <li>
                  <Link href="/search" className="hover:text-white transition-colors">
                    Instalasi Sanitari
                  </Link>
                </li>
                <li>
                  <Link href="/search" className="hover:text-white transition-colors">
                    Deteksi Pipa Bocor
                  </Link>
                </li>
                <li>
                  <Link href="/search" className="hover:text-white transition-colors">
                    Perawatan Berkala AC
                  </Link>
                </li>
                <li>
                  <Link href="/search" className="hover:text-white transition-colors">
                    Layanan Darurat 2 Jam
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: BuildMate (The Estate) */}
            <div>
              <h4 className="font-serif text-[17px] text-white mb-4 font-normal">
                BuildMate
              </h4>
              <ul className="space-y-2 text-[13px] text-lavender-200/90 font-sans">
                <li>
                  <Link href="/#komitmen" className="hover:text-white transition-colors">
                    Tentang Kami
                  </Link>
                </li>
                <li>
                  <Link href="/#mitra" className="hover:text-white transition-colors">
                    Standar Kurasi Mitra
                  </Link>
                </li>
                <li>
                  <Link href="/#cara-kerja" className="hover:text-white transition-colors">
                    Rekening Bersama
                  </Link>
                </li>
                <li>
                  <Link href="/plus" className="hover:text-white transition-colors">
                    BuildMate Plus & Garansi
                  </Link>
                </li>
                <li>
                  <span className="inline-flex items-center gap-1.5 text-lavender-300 text-xs">
                    <Crown1 size={13} className="text-lavender-300 shrink-0" />
                    <span>Midtrans Sandbox</span>
                  </span>
                </li>
              </ul>
            </div>

            {/* Col 4: Bantuan (Help) */}
            <div>
              <h4 className="font-serif text-[17px] text-white mb-4 font-normal">
                Bantuan
              </h4>
              <ul className="space-y-2 text-[13px] text-lavender-200/90 font-sans">
                <li>
                  <Link href="/#cara-kerja" className="hover:text-white transition-colors">
                    Cara Kerja Pemesanan
                  </Link>
                </li>
                <li>
                  <a
                    href="https://wa.me/6281200000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <WhatsappIcon size={13} color="#AC97FB" />
                    <span>WhatsApp Bantuan</span>
                  </a>
                </li>
                <li>
                  <Link href="/admin" className="hover:text-white transition-colors">
                    Ruang Kendali Admin
                  </Link>
                </li>
                <li>
                  <Link href="/#faq" className="hover:text-white transition-colors">
                    Tanya Jawab (FAQ)
                  </Link>
                </li>
                <li>
                  <Link href="/#garansi" className="hover:text-white transition-colors">
                    Kebijakan Garansi
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 5: Terhubung (Get The Dirt) */}
            <div>
              <h4 className="font-serif text-[17px] text-white mb-4 font-normal">
                Terhubung
              </h4>
              {/* Social Media Icons Row */}
              <div className="flex items-center gap-3.5 text-white/90 mb-4">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="hover:text-white hover:scale-110 transition-all"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="hover:text-white hover:scale-110 transition-all"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X"
                  className="hover:text-white hover:scale-110 transition-all"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://wa.me/6281200000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="hover:text-white hover:scale-110 transition-all"
                >
                  <WhatsappIcon size={16} color="#FFFFFF" />
                </a>
              </div>
              <ul className="space-y-2 text-[13px] text-lavender-200/90 font-sans">
                <li>
                  <Link href="/mitra/register" className="hover:text-white font-medium text-white transition-colors">
                    Daftar Sebagai Mitra
                  </Link>
                </li>
                <li>
                  <Link href="/#mitra" className="hover:text-white transition-colors">
                    Verifikasi KTP & SKCK
                  </Link>
                </li>
                <li>
                  <span className="text-lavender-300/80 text-xs">
                    Seluruh Wilayah Indonesia
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Centered Crest Seal in Flamingo Estate Style (Floating without harsh lines) */}
          <div className="pt-12 pb-12 flex flex-col items-center justify-center text-center font-sans">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm mb-3.5 border border-white/20 flex items-center justify-center bg-white/10 backdrop-blur-xs">
              <img
                src="/icon.svg"
                alt="BuildMate Icon"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="font-sans tracking-[0.28em] text-[11px] text-white uppercase font-semibold">
              BUILDMATE
            </p>
            <p className="text-[10px] text-lavender-300 tracking-[0.16em] mt-1 uppercase font-sans">
              Standar Integritas & Ketenangan Hunian
            </p>
          </div>

          {/* Bottom Row: Copyright on Left, Legal on Right (Aligned with centered columns) */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-lavender-300/80 font-sans">
            <p>© 2026 BuildMate SaaS Solo Challenge – Seluruh Hak Cipta Dilindungi</p>
            <div className="flex items-center gap-3 text-lavender-300/80">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privasi
              </Link>
              <span>|</span>
              <Link href="/terms" className="hover:text-white transition-colors">
                Syarat & Ketentuan
              </Link>
              <span>|</span>
              <span>Midtrans Sandbox</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
