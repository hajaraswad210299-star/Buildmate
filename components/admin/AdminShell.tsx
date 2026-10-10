"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Element3,
  ReceiptText,
  UserOctagon,
  Category2,
  Card,
  WalletMoney,
  Profile2User,
  Setting2,
  LogoutCurve,
  Notification,
  SearchNormal1,
  Menu,
  CloseCircle,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";
import { toast } from "sonner";

interface AdminShellProps {
  children: React.ReactNode;
}

function AdminShellInner({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Restore collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("buildmate_admin_collapsed");
    if (saved !== null) {
      const isCol = saved === "true";
      requestAnimationFrame(() => setCollapsed(isCol));
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("buildmate_admin_collapsed", String(next));
  };

  interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{
      size?: number;
      variant?: "Linear" | "Outline" | "Broken" | "Bold" | "Bulk" | "TwoTone";
      className?: string;
    }>;
    exact?: boolean;
    badge?: number;
    badgeUrgent?: boolean;
  }

  const navGroups: { group: string; items: NavItem[] }[] = [
    {
      group: "UTAMA",
      items: [
        {
          label: "Dashboard",
          href: "/admin",
          icon: Element3,
          exact: true,
        },
        {
          label: "Pesanan",
          href: "/admin/orders",
          icon: ReceiptText,
          badge: 2,
          badgeUrgent: true,
        },
      ],
    },
    {
      group: "KATALOG",
      items: [
        {
          label: "Tukang",
          href: "/admin/workers",
          icon: UserOctagon,
          badge: 1,
        },
        {
          label: "Layanan",
          href: "/admin/services",
          icon: Category2,
        },
      ],
    },
    {
      group: "KEUANGAN",
      items: [
        {
          label: "Transaksi",
          href: "/admin/transactions",
          icon: Card,
        },
        {
          label: "Pencairan Dana",
          href: "/admin/payouts",
          icon: WalletMoney,
          badge: 1,
        },
      ],
    },
    {
      group: "PENGGUNA",
      items: [
        {
          label: "Pelanggan & Member",
          href: "/admin/customers",
          icon: Profile2User,
        },
      ],
    },
    {
      group: "SISTEM",
      items: [
        {
          label: "Pengaturan",
          href: "/admin/settings",
          icon: Setting2,
        },
      ],
    },
  ];

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    toast.success("Kamu sudah keluar dari dashboard.");
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-neutral-100/60 text-neutral-900 p-2 sm:p-4 lg:p-6 flex flex-col items-center">
      {/* Outer Floating Application Frame mimicking the Reference Image */}
      <div className="w-full max-w-[1560px] bg-white rounded-3xl border border-neutral-200/90 shadow-md flex overflow-hidden min-h-[92vh]">
        {/* DESKTOP SIDEBAR */}
        <aside
          className={cn(
            "hidden lg:flex flex-col bg-neutral-25 border-r border-neutral-200/80 transition-all duration-200 shrink-0 select-none",
            collapsed ? "w-[76px]" : "w-[264px]"
          )}
        >
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-neutral-100">
            <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-lavender-700 to-lavender-500 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
                BM
              </div>
              {!collapsed && (
                <div className="flex flex-col leading-none">
                  <span className="font-bold text-sm tracking-tight text-neutral-900 flex items-center gap-1">
                    BuildMate<span className="text-[10px] text-lavender-600 font-semibold">™</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">Admin Workspace</span>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              title={collapsed ? "Perluas menu" : "Ciutkan menu"}
            >
              <Menu size={16} />
            </button>
          </div>

          {/* Search Button / ⌘K */}
          <div className="p-3">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className={cn(
                "w-full flex items-center rounded-xl bg-neutral-100/80 hover:bg-neutral-200/70 text-neutral-500 text-xs py-2 px-3 transition-colors border border-neutral-200/60 shadow-xs",
                collapsed ? "justify-center px-2" : "justify-between"
              )}
            >
              <div className="flex items-center gap-2">
                <SearchNormal1 size={15} className="text-neutral-400" />
                {!collapsed && <span>Cari cepat...</span>}
              </div>
              {!collapsed && (
                <kbd className="px-1.5 py-0.5 text-[10px] bg-white text-neutral-400 rounded border border-neutral-200 font-mono">
                  ⌘K
                </kbd>
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
            {navGroups.map((grp) => (
              <div key={grp.group} className="space-y-1">
                {!collapsed && (
                  <span className="px-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                    {grp.group}
                  </span>
                )}
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group",
                        isActive
                          ? "bg-white text-lavender-700 font-semibold shadow-xs border border-neutral-200/60"
                          : "text-neutral-600 hover:bg-neutral-100/70 hover:text-neutral-900"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 bg-lavender-600 rounded-r-md" />
                      )}

                      <Icon
                        size={18}
                        variant={isActive ? "Bold" : "Linear"}
                        className={cn(
                          "shrink-0 transition-colors",
                          isActive ? "text-lavender-600" : "text-neutral-400 group-hover:text-neutral-700"
                        )}
                      />

                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}

                      {!collapsed && item.badge !== undefined && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums",
                            item.badgeUrgent
                              ? "bg-danger-50 text-danger-700 border border-danger-200"
                              : "bg-lavender-100 text-lavender-700"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Admin Profile & Logout */}
          <div className="p-3 border-t border-neutral-100">
            <div
              className={cn(
                "p-2 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between",
                collapsed && "flex-col gap-2 p-1.5"
              )}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-lavender-100 text-lavender-800 flex items-center justify-center font-bold text-xs shrink-0">
                  SA
                </div>
                {!collapsed && (
                  <div className="flex flex-col overflow-hidden leading-tight">
                    <span className="text-xs font-semibold text-neutral-800 truncate">
                      Super Admin
                    </span>
                    <span className="text-[10px] text-neutral-400 truncate">
                      admin@buildmate.id
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                title="Keluar"
              >
                <LogoutCurve size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 bg-neutral-50/50">
          {/* Topbar */}
          <header className="h-16 bg-white/95 backdrop-blur-xs border-b border-neutral-200/80 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden p-2 rounded-xl text-neutral-600 hover:bg-neutral-100"
              >
                <Menu size={20} />
              </button>

              <div>
                <span className="text-xs font-medium text-neutral-400">
                  BuildMate Admin Panel
                </span>
                <h1 className="text-sm font-semibold text-neutral-800 truncate">
                  Ruang Kendali Operasional
                </h1>
              </div>
            </div>

            {/* Right Action Tools */}
            <div className="flex items-center gap-2.5">
              {/* Quick Search */}
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200/80 bg-neutral-50 hover:bg-neutral-100 text-xs text-neutral-600 transition-colors shadow-xs"
              >
                <SearchNormal1 size={14} className="text-neutral-400" />
                <span>Cari</span>
                <kbd className="px-1 text-[10px] bg-white rounded border border-neutral-200 font-mono text-neutral-400">
                  ⌘K
                </kbd>
              </button>

              {/* Notification Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors border border-neutral-200/60 shadow-xs"
                  title="Notifikasi"
                >
                  <Notification size={18} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger-500 ring-2 ring-white animate-pulse" />
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-neutral-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                      <span className="text-xs font-semibold text-neutral-800">
                        Pemberitahuan Terkini
                      </span>
                      <span className="text-[10px] bg-lavender-100 text-lavender-700 font-bold px-1.5 py-0.5 rounded-full">
                        2 baru
                      </span>
                    </div>

                    <div className="py-2 space-y-2">
                      <Link
                        href="/admin/orders/ord-3"
                        onClick={() => setShowNotifications(false)}
                        className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-neutral-50 text-xs transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-danger-500 mt-1 shrink-0" />
                        <div>
                          <p className="font-semibold text-neutral-800">
                            Tawaran ditolak tukang
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            BM-261010-0015 perlu dicarikan tukang pengganti
                          </p>
                        </div>
                      </Link>

                      <Link
                        href="/admin/workers?tab=applications"
                        onClick={() => setShowNotifications(false)}
                        className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-neutral-50 text-xs transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-lavender-600 mt-1 shrink-0" />
                        <div>
                          <p className="font-semibold text-neutral-800">
                            Pendaftaran mitra baru
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            Rian Pramono menunggu peninjauan profil
                          </p>
                        </div>
                      </Link>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 text-center">
                      <Link
                        href="/admin/orders?tab=action_needed"
                        onClick={() => setShowNotifications(false)}
                        className="text-xs font-semibold text-lavender-600 hover:text-lavender-700"
                      >
                        Buka Antrean Tindakan →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Header Action Button */}
              <Link
                href="/admin/orders"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Kelola Pesanan</span>
              </Link>
            </div>
          </header>

          {/* Page Children */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-72 bg-white h-full p-4 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-3">
              <span className="font-bold text-sm text-neutral-800">BuildMate Admin</span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <CloseCircle size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-4 overflow-y-auto">
              {navGroups.map((grp) => (
                <div key={grp.group} className="space-y-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block px-2">
                    {grp.group}
                  </span>
                  {grp.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium",
                        pathname === item.href
                          ? "bg-lavender-50 text-lavender-700 font-semibold"
                          : "text-neutral-600 hover:bg-neutral-100"
                      )}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-danger-50 text-danger-700 text-xs font-semibold"
            >
              <LogoutCurve size={16} />
              <span>Keluar dari Admin</span>
            </button>
          </div>
        </div>
      )}

      {/* COMMAND PALETTE MODAL */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-neutral-800">Keluar dari Akun Admin?</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Kamu harus memasukkan email dan kata sandi kembali untuk mengakses dashboard.
            </p>
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-danger-600 hover:bg-danger-700 rounded-lg shadow-xs"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminShell(props: AdminShellProps) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-neutral-100/60 p-6 flex items-center justify-center text-xs text-neutral-400">
          Memuat antarmuka admin...
        </div>
      }
    >
      <AdminShellInner {...props} />
    </React.Suspense>
  );
}
