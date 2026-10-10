"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SearchNormal1, ReceiptText, UserOctagon, Category2, Card, WalletMoney, Setting2, CloseCircle } from "@/lib/icons";
import { MOCK_ORDERS, MOCK_WORKERS } from "@/lib/mock/data";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const navigationPages = [
    { title: "Dashboard", href: "/admin", icon: <Category2 size={16} /> },
    { title: "Pesanan", href: "/admin/orders", icon: <ReceiptText size={16} /> },
    { title: "Tukang & Mitra", href: "/admin/workers", icon: <UserOctagon size={16} /> },
    { title: "Layanan & Paket", href: "/admin/services", icon: <Category2 size={16} /> },
    { title: "Transaksi Midtrans", href: "/admin/transactions", icon: <Card size={16} /> },
    { title: "Pencairan Dana", href: "/admin/payouts", icon: <WalletMoney size={16} /> },
    { title: "Pengaturan Sistem", href: "/admin/settings", icon: <Setting2 size={16} /> },
  ].filter((p) => p.title.toLowerCase().includes(q));

  const matchedOrders = MOCK_ORDERS.filter(
    (o) =>
      o.order_code.toLowerCase().includes(q) ||
      o.customer.name.toLowerCase().includes(q)
  ).slice(0, 4);

  const matchedWorkers = MOCK_WORKERS.filter(
    (w) =>
      w.full_name.toLowerCase().includes(q) ||
      w.service_area.toLowerCase().includes(q)
  ).slice(0, 3);

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-neutral-100 gap-3">
          <SearchNormal1 size={18} className="text-neutral-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pesanan (BM-...), tukang, atau navigasi..."
            className="flex-1 text-sm bg-transparent border-none outline-none text-neutral-800 placeholder:text-neutral-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <CloseCircle size={16} />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 text-[10px] bg-neutral-100 text-neutral-500 rounded font-mono border border-neutral-200">
            Esc
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-4">
          {/* Group 1: Navigation */}
          {navigationPages.length > 0 && (
            <div>
              <span className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Halaman
              </span>
              <div className="mt-1 space-y-0.5">
                {navigationPages.map((page) => (
                  <button
                    key={page.href}
                    onClick={() => handleSelect(page.href)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-neutral-700 hover:bg-lavender-50 hover:text-lavender-700 transition-colors text-left"
                  >
                    <span className="text-neutral-400">{page.icon}</span>
                    <span className="font-medium">{page.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group 2: Orders */}
          {matchedOrders.length > 0 && (
            <div>
              <span className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Pesanan
              </span>
              <div className="mt-1 space-y-0.5">
                {matchedOrders.map((ord) => (
                  <button
                    key={ord.id}
                    onClick={() => handleSelect(`/admin/orders/${ord.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-neutral-700 hover:bg-lavender-50 hover:text-lavender-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-neutral-900">
                        {ord.order_code}
                      </span>
                      <span className="text-neutral-500">· {ord.customer.name}</span>
                    </div>
                    <span className="text-[11px] text-neutral-400">{ord.package.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group 3: Workers */}
          {matchedWorkers.length > 0 && (
            <div>
              <span className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Tukang
              </span>
              <div className="mt-1 space-y-0.5">
                {matchedWorkers.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => handleSelect(`/admin/workers?search=${encodeURIComponent(w.full_name)}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-neutral-700 hover:bg-lavender-50 hover:text-lavender-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-900">{w.full_name}</span>
                      <span className="text-neutral-400">({w.service_area})</span>
                    </div>
                    <span className="text-[11px] text-neutral-400">
                      {w.is_verified ? "Terverifikasi" : "Belum verifikasi"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {navigationPages.length === 0 && matchedOrders.length === 0 && matchedWorkers.length === 0 && (
            <div className="py-8 text-center text-xs text-neutral-400">
              Tidak ada hasil yang cocok dengan &quot;{query}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
