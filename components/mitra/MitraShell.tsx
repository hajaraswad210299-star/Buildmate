"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home2,
  Briefcase,
  Wallet3,
  ProfileCircle,
  Verify,
  ArrowLeft2,
} from "@/lib/icons";

interface MitraShellProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  backHref?: string;
  isVerified?: boolean;
  hideNav?: boolean;
  newOffersCount?: number;
  rightAction?: React.ReactNode;
}

export function MitraShell({
  children,
  title,
  showBack = false,
  backHref,
  isVerified = false,
  hideNav = false,
  newOffersCount = 1,
  rightAction,
}: MitraShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [bumpOffers, setBumpOffers] = useState(false);

  // Trigger pulse effect when new offer arrives
  useEffect(() => {
    if (newOffersCount > 0) {
      setBumpOffers(true);
      const timer = setTimeout(() => setBumpOffers(false), 800);
      return () => clearTimeout(timer);
    }
  }, [newOffersCount]);

  const navItems = [
    {
      label: "Beranda",
      href: "/mitra",
      icon: Home2,
      exact: true,
    },
    {
      label: "Pekerjaan",
      href: "/mitra/jobs",
      icon: Briefcase,
      badgeCount: newOffersCount,
      exact: false,
    },
    {
      label: "Pendapatan",
      href: "/mitra/earnings",
      icon: Wallet3,
      exact: false,
    },
    {
      label: "Profil",
      href: "/mitra/profile",
      icon: ProfileCircle,
      exact: false,
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-100/60 font-sans text-neutral-900 flex justify-center selection:bg-lavender-200 selection:text-lavender-900">
      {/* Desktop Centered Container (Max 480px, A2) */}
      <div className="w-full max-w-[480px] bg-white min-h-screen flex flex-col shadow-sm relative">
        {/* Top Bar (56px) */}
        <header className="sticky top-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {showBack ? (
              <button
                type="button"
                onClick={() => (backHref ? router.push(backHref) : router.back())}
                className="w-9 h-9 -ml-1 rounded-xl flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors"
                aria-label="Kembali"
              >
                <ArrowLeft2 size={20} />
              </button>
            ) : null}

            {title ? (
              <h1 className="font-serif text-lg font-medium text-neutral-900 truncate">
                {title}
              </h1>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-xl tracking-tight text-neutral-900">
                  BuildMate
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-lavender-700 uppercase bg-lavender-50 px-2 py-0.5 rounded-full border border-lavender-200/60">
                  Mitra
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {rightAction ? (
              rightAction
            ) : isVerified ? (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-success-50 border border-success-200/60 text-success-700 text-xs font-medium"
                title="Mitra Terverifikasi"
              >
                <Verify size={14} variant="Bold" className="text-success-600" />
                <span className="text-[11px] font-semibold">Terverifikasi</span>
              </div>
            ) : null}
          </div>
        </header>

        {/* Main Content Area */}
        <main className={`flex-1 pb-safe ${hideNav ? "pb-24" : "pb-20"}`}>
          {children}
        </main>

        {/* Bottom Nav (64px + Safe-Area) */}
        {!hideNav && (
          <nav
            aria-label="Navigasi Bawah"
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-16 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 px-2 flex items-center justify-around z-40 shadow-lg"
          >
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-20 h-12 rounded-xl transition-all relative ${
                    isActive ? "text-lavender-600 font-semibold" : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  {/* Active Background Pill */}
                  {isActive && (
                    <span className="absolute inset-x-2 inset-y-1 bg-lavender-50 rounded-xl -z-10 transition-all duration-200" />
                  )}

                  <div className="relative">
                    <Icon
                      size={22}
                      variant={isActive ? "Bold" : "Linear"}
                      className={`transition-transform duration-200 ${isActive ? "scale-110" : "scale-100"}`}
                    />

                    {/* Notification Badge on Briefcase for new offers */}
                    {item.badgeCount && item.badgeCount > 0 ? (
                      <span
                        className={`absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 bg-danger-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center transition-transform ${
                          bumpOffers ? "scale-125" : "scale-100"
                        }`}
                      >
                        {item.badgeCount}
                      </span>
                    ) : null}
                  </div>

                  <span className="text-[11px] tracking-tight mt-0.5">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
