"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  SearchNormal1,
  ReceiptText,
  UserOctagon,
  Category2,
  Card,
  WalletMoney,
  Setting2,
  CloseCircle,
  Profile2User,
  ArrowRight,
} from "@/lib/icons";
import { getOrders } from "@/lib/data/orders";
import { getWorkers } from "@/lib/data/workers";
import { Order, Worker } from "@/lib/data/types";
import { MOCK_ORDERS, MOCK_WORKERS } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  category: "Halaman" | "Pesanan" | "Tukang";
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  href: string;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [workers, setWorkers] = useState<Worker[]>(MOCK_WORKERS);

  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Fetch real data when palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      getOrders().then((res) => {
        if (res && res.length > 0) setOrders(res);
      }).catch(() => {});
      getWorkers().then((res) => {
        if (res && res.length > 0) setWorkers(res);
      }).catch(() => {});
    }
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const q = query.toLowerCase().trim();

  // 1. Navigation items
  const navigationPages: PaletteItem[] = useMemo(() => [
    { id: "nav-dash", category: "Halaman", title: "Dashboard Utama", subtitle: "Ringkasan metrik & aktivitas operasional", href: "/admin", icon: <Category2 size={16} /> },
    { id: "nav-ord", category: "Halaman", title: "Kelola Pesanan", subtitle: "Daftar pesanan, status dispatch & audit", href: "/admin/orders", icon: <ReceiptText size={16} /> },
    { id: "nav-wrk", category: "Halaman", title: "Mitra Tukang", subtitle: "Daftar mitra, verifikasi & antrean pendaftaran", href: "/admin/workers", icon: <UserOctagon size={16} /> },
    { id: "nav-srv", category: "Halaman", title: "Layanan & Paket", subtitle: "Katalog jasa perbaikan dan tarif flat", href: "/admin/services", icon: <Category2 size={16} /> },
    { id: "nav-trx", category: "Halaman", title: "Transaksi & Pembayaran", subtitle: "Verifikasi gateway Midtrans & escrow", href: "/admin/transactions", icon: <Card size={16} /> },
    { id: "nav-pay", category: "Halaman", title: "Pencairan Dana (Payouts)", subtitle: "Ledger escrow dan tanda pencairan mitra", href: "/admin/payouts", icon: <WalletMoney size={16} /> },
    { id: "nav-cst", category: "Halaman", title: "Pelanggan & Member Plus", subtitle: "Data pengguna terdaftar & langganan", href: "/admin/customers", icon: <Profile2User size={16} /> },
    { id: "nav-set", category: "Halaman", title: "Pengaturan Sistem", subtitle: "Konfigurasi SLA, nomor WA, dan fee", href: "/admin/settings", icon: <Setting2 size={16} /> },
  ], []);

  // Filter groups
  const filteredNav = useMemo(() => {
    if (!q) return navigationPages;
    return navigationPages.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.subtitle && p.subtitle.toLowerCase().includes(q))
    );
  }, [navigationPages, q]);

  const matchedOrders: PaletteItem[] = useMemo(() => {
    if (!q) return [];
    return orders
      .filter(
        (o) =>
          o.order_code.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.package.name.toLowerCase().includes(q) ||
          (o.address && o.address.toLowerCase().includes(q))
      )
      .slice(0, 5)
      .map((ord) => ({
        id: `ord-${ord.id}`,
        category: "Pesanan" as const,
        title: ord.order_code,
        subtitle: `${ord.customer.name} · ${ord.package.name}`,
        badge: ord.status,
        href: `/admin/orders/${ord.id}`,
      }));
  }, [orders, q]);

  const matchedWorkers: PaletteItem[] = useMemo(() => {
    if (!q) return [];
    return workers
      .filter(
        (w) =>
          w.full_name.toLowerCase().includes(q) ||
          w.service_area.toLowerCase().includes(q) ||
          (w.phone && w.phone.includes(q))
      )
      .slice(0, 5)
      .map((w) => ({
        id: `wrk-${w.id}`,
        category: "Tukang" as const,
        title: w.full_name,
        subtitle: `${w.service_area} · ${w.experience_years} th pengalaman`,
        badge: w.is_verified ? "Terverifikasi" : "Belum verifikasi",
        href: `/admin/workers?search=${encodeURIComponent(w.full_name)}`,
      }));
  }, [workers, q]);

  // Combined flat list for unified arrow navigation
  const flatItems: PaletteItem[] = useMemo(() => {
    return [...filteredNav, ...matchedOrders, ...matchedWorkers];
  }, [filteredNav, matchedOrders, matchedWorkers]);

  // Reset selectedIndex when list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [q]);

  // Scroll active item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  // Keyboard navigation inside the palette
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = flatItems[selectedIndex];
      if (selected) {
        handleSelect(selected.href);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  let runningIndex = 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-neutral-200/90 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-neutral-100 gap-3 bg-neutral-50/50">
          <SearchNormal1 size={18} className="text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari pesanan (ORD-...), nama tukang, atau halaman..."
            className="flex-1 text-xs sm:text-sm bg-transparent border-none outline-none text-neutral-800 placeholder:text-neutral-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
              title="Hapus pencarian"
            >
              <CloseCircle size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-100 text-neutral-500 rounded border border-neutral-200 font-sans shadow-2xs">
            Esc
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-3.5">
          {/* Group 1: Navigation Pages */}
          {filteredNav.length > 0 && (
            <div>
              <span className="px-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Navigasi Halaman
              </span>
              <div className="space-y-0.5">
                {filteredNav.map((page) => {
                  const itemIndex = runningIndex++;
                  const isCurrent = itemIndex === selectedIndex;
                  return (
                    <button
                      key={page.id}
                      ref={(el) => {
                        itemRefs.current[itemIndex] = el;
                      }}
                      type="button"
                      onClick={() => handleSelect(page.href)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left select-none cursor-pointer",
                        isCurrent
                          ? "bg-lavender-100 text-lavender-950 font-semibold ring-1 ring-lavender-200"
                          : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                      )}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className={cn(isCurrent ? "text-lavender-700" : "text-neutral-400")}>
                          {page.icon}
                        </span>
                        <div className="truncate">
                          <span className="block truncate font-medium">{page.title}</span>
                          {page.subtitle && (
                            <span className={cn("text-[11px] block truncate", isCurrent ? "text-lavender-700/80" : "text-neutral-400")}>
                              {page.subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                      {isCurrent && (
                        <div className="flex items-center gap-1 text-[11px] text-lavender-700 shrink-0 ml-2">
                          <span className="text-[10px] hidden sm:inline">Buka</span>
                          <ArrowRight size={13} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Group 2: Orders */}
          {matchedOrders.length > 0 && (
            <div>
              <span className="px-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Data Pesanan
              </span>
              <div className="space-y-0.5">
                {matchedOrders.map((ord) => {
                  const itemIndex = runningIndex++;
                  const isCurrent = itemIndex === selectedIndex;
                  return (
                    <button
                      key={ord.id}
                      ref={(el) => {
                        itemRefs.current[itemIndex] = el;
                      }}
                      type="button"
                      onClick={() => handleSelect(ord.href)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left select-none cursor-pointer",
                        isCurrent
                          ? "bg-lavender-100 text-lavender-950 font-semibold ring-1 ring-lavender-200"
                          : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="font-mono font-bold text-neutral-900 shrink-0">
                          {ord.title}
                        </span>
                        <span className={cn("truncate", isCurrent ? "text-lavender-800" : "text-neutral-500")}>
                          · {ord.subtitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {ord.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600">
                            {ord.badge}
                          </span>
                        )}
                        {isCurrent && <ArrowRight size={13} className="text-lavender-700" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Group 3: Workers */}
          {matchedWorkers.length > 0 && (
            <div>
              <span className="px-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Mitra Tukang
              </span>
              <div className="space-y-0.5">
                {matchedWorkers.map((w) => {
                  const itemIndex = runningIndex++;
                  const isCurrent = itemIndex === selectedIndex;
                  return (
                    <button
                      key={w.id}
                      ref={(el) => {
                        itemRefs.current[itemIndex] = el;
                      }}
                      type="button"
                      onClick={() => handleSelect(w.href)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left select-none cursor-pointer",
                        isCurrent
                          ? "bg-lavender-100 text-lavender-950 font-semibold ring-1 ring-lavender-200"
                          : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="font-semibold text-neutral-900 shrink-0">
                          {w.title}
                        </span>
                        <span className={cn("truncate text-[11px]", isCurrent ? "text-lavender-800" : "text-neutral-400")}>
                          ({w.subtitle})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {w.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600">
                            {w.badge}
                          </span>
                        )}
                        {isCurrent && <ArrowRight size={13} className="text-lavender-700" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty Search State */}
          {flatItems.length === 0 && (
            <div className="py-10 text-center space-y-1">
              <p className="text-xs font-medium text-neutral-700">
                Tidak ada hasil ditemukan
              </p>
              <p className="text-[11px] text-neutral-400">
                Tidak ada kecocokan untuk &quot;{query}&quot;. Coba cari kata kunci lain.
              </p>
            </div>
          )}
        </div>

        {/* Footer Keyboard Guide */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-t border-neutral-100 text-[11px] text-neutral-400 select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-neutral-200 font-sans text-[10px] shadow-2xs font-semibold text-neutral-500">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-neutral-200 font-sans text-[10px] shadow-2xs font-semibold text-neutral-500">
                ↓
              </kbd>
              <span className="text-[10px]">Pilih</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-neutral-200 font-sans text-[10px] shadow-2xs font-semibold text-neutral-500">
                ↵
              </kbd>
              <span className="text-[10px]">Buka</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-neutral-200 font-sans text-[10px] shadow-2xs font-semibold text-neutral-500">
                Esc
              </kbd>
              <span className="text-[10px]">Tutup</span>
            </span>
          </div>
          <span className="text-[10px] text-neutral-400">
            {flatItems.length} hasil
          </span>
        </div>
      </div>
    </div>
  );
}
