"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Element3,
  ReceiptText,
  UserOctagon,
  Category2,
  Briefcase,
  Card,
  WalletMoney,
  Profile2User,
  Setting2,
  LogoutCurve,
  Notification,
  SearchNormal1,
  SidebarLeft,
  HambergerMenu,
  CloseCircle,
  ArrowUp2,
  SecurityUser,
  DocumentText,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared/Button";
import { CommandPalette } from "./CommandPalette";
import { PermissionProvider, usePermissions } from "./PermissionGate";
import { Permission } from "@/lib/auth/permissions";
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
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [adminUser, setAdminUser] = useState<{
    name: string;
    email: string;
    avatarUrl?: string | null;
  }>({
    name: "Theo Nakamura",
    email: "jonathanhuang88@proton.me",
    avatarUrl: null,
  });

  // Detect Mac vs Windows/Linux
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent));
  }, []);

  // Restore collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("buildmate_admin_collapsed");
    if (saved !== null) {
      const isCol = saved === "true";
      requestAnimationFrame(() => setCollapsed(isCol));
    }
  }, []);

  // Global Keyboard shortcuts: ⌘K / Ctrl+K & / (Cari Cepat), ⌘B / Ctrl+B (Sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Sidebar toggle: Cmd+B / Ctrl+B
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((prev) => {
          const next = !prev;
          localStorage.setItem("buildmate_admin_collapsed", String(next));
          return next;
        });
        return;
      }

      // 2. Command Palette toggle: Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // 3. Quick Search trigger with '/' when not typing in an input
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isInput =
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.tagName === "SELECT" ||
          target?.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          setIsCommandPaletteOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle bfcache: if user pressed back/forward and page was restored from cache, force reload
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Monitor auth state: if signed out, lock out immediately
  useEffect(() => {
    let active = true;
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        if (event === "SIGNED_OUT" || !session) {
          window.location.replace("/admin/login");
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    });
    return () => {
      active = false;
    };
  }, []);

  // Fetch admin profile
  useEffect(() => {
    const fetchProfile = () => {
      import("@/lib/supabase/client").then(({ createClient }) => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", user.id)
              .single()
              .then(({ data: profile }) => {
                setAdminUser({
                  name: profile?.full_name || user.user_metadata?.full_name || "Theo Nakamura",
                  email: user.email || "jonathanhuang88@proton.me",
                  avatarUrl: profile?.avatar_url || null,
                });
              });
          }
        });
      });
    };

    fetchProfile();

    const handleProfileUpdated = (e: any) => {
      if (e?.detail) {
        setAdminUser((prev) => ({
          ...prev,
          name: e.detail.fullName ?? prev.name,
          email: e.detail.email ?? prev.email,
          avatarUrl: e.detail.avatarUrl !== undefined ? e.detail.avatarUrl : prev.avatarUrl,
        }));
      } else {
        fetchProfile();
      }
    };

    window.addEventListener("admin_profile_updated", handleProfileUpdated);
    return () => window.removeEventListener("admin_profile_updated", handleProfileUpdated);
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
    permission?: Permission | Permission[];
    adminOnly?: boolean;
  }

  const { can, isAdmin, isStaff, roleName } = usePermissions();

  const navGroups: { group: string; items: NavItem[] }[] = [
    {
      group: "UTAMA",
      items: [
        {
          label: "Dashboard",
          href: "/admin",
          icon: Element3,
          exact: true,
          permission: "dashboard.view",
        },
        {
          label: "Pesanan",
          href: "/admin/orders",
          icon: ReceiptText,
          badge: 2,
          badgeUrgent: true,
          permission: "orders.view",
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
          permission: "workers.view",
        },
        {
          label: "Layanan",
          href: "/admin/services",
          icon: Briefcase,
          permission: "services.view",
        },
        {
          label: "Konten Situs",
          href: "/admin/content",
          icon: DocumentText,
          permission: "content.manage",
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
          permission: "transactions.view",
        },
        {
          label: "Pencairan Dana",
          href: "/admin/payouts",
          icon: WalletMoney,
          badge: 1,
          permission: "payouts.view",
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
          permission: "customers.view",
        },
        {
          label: "Tim & Akses",
          href: "/admin/team",
          icon: SecurityUser,
          adminOnly: true,
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

  const filteredNavGroups = navGroups
    .map((grp) => ({
      ...grp,
      items: grp.items.filter((item) => {
        if (item.adminOnly) return isAdmin;
        if (item.permission) return can(item.permission);
        return true;
      }),
    }))
    .filter((grp) => grp.items.length > 0);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    try {
       const { createClient } = await import("@/lib/supabase/client");
       const supabase = createClient();
       await supabase.auth.signOut();
     } catch {
       // ignore
     }
     toast.success("Kamu sudah keluar dari dashboard.");
     window.location.replace("/admin/login");
   };

  // Compute breadcrumb trail
  const getBreadcrumbTitle = () => {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/orders/")) return "Detail Pesanan";
    if (pathname === "/admin/orders") return "Pesanan";
    if (pathname === "/admin/workers") return "Tukang";
    if (pathname === "/admin/services") return "Layanan";
    if (pathname === "/admin/content") return "Konten Situs";
    if (pathname === "/admin/transactions") return "Transaksi";
    if (pathname === "/admin/payouts") return "Pencairan Dana";
    if (pathname === "/admin/customers") return "Pelanggan & Member";
    if (pathname === "/admin/team") return "Tim & Akses";
    if (pathname === "/admin/settings") return "Pengaturan";
    if (pathname === "/admin/no-access") return "Tidak Punya Akses";
    return "Dashboard";
  };

  return (
    <div
      data-collapsed={collapsed}
      className={cn(
        "grid h-dvh w-dvw overflow-hidden bg-neutral-50 text-neutral-900 select-none",
        collapsed
          ? "lg:grid-cols-[76px_minmax(0,1fr)]"
          : "lg:grid-cols-[264px_minmax(0,1fr)]"
      )}
    >
      {/* 1. DESKTOP FIXED SIDEBAR */}
      <aside className="hidden lg:flex flex-col h-dvh min-h-0 border-r border-neutral-200 bg-neutral-25">
        {/* Layer 1: Header logo — tinggi 64px, tetap */}
        <div
          className={cn(
            "h-16 shrink-0 border-b border-neutral-200 flex items-center transition-all",
            collapsed ? "justify-center px-2" : "justify-between px-5"
          )}
        >
          {collapsed ? (
            <Link href="/admin" title="BuildMate Workspace" className="shrink-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon.svg"
                alt="BuildMate"
                className="w-8 h-8 rounded-xl object-contain shadow-xs hover:scale-105 transition-transform"
              />
            </Link>
          ) : (
            <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon.svg"
                alt="BuildMate"
                className="w-8 h-8 rounded-xl object-contain shadow-xs shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col leading-none">
                <span className="font-bold text-sm tracking-tight text-neutral-900 flex items-center gap-1">
                  BuildMate<span className="text-[10px] text-lavender-600 font-semibold">™</span>
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5">Admin Workspace</span>
              </div>
            </Link>
          )}

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex items-center justify-center"
            title={collapsed ? "Perluas menu (⌘B)" : "Ciutkan menu (⌘B)"}
          >
            <SidebarLeft
              size={18}
              className={cn(
                "transition-transform duration-200",
                collapsed && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Layer 2: Cari cepat — tetap */}
        <div className="shrink-0 p-3">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className={cn(
              "w-full flex items-center rounded-xl bg-neutral-100 hover:bg-neutral-200/70 text-neutral-600 text-xs py-2 px-3 transition-all border border-neutral-200/70 shadow-2xs group cursor-pointer",
              collapsed ? "justify-center px-2" : "justify-between"
            )}
            title={`Cari cepat (${isMac ? "⌘K" : "Ctrl+K"})`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <SearchNormal1
                size={15}
                className="text-neutral-400 group-hover:text-lavender-600 transition-colors shrink-0"
              />
              {!collapsed && (
                <span className="text-neutral-500 font-normal truncate">Cari cepat…</span>
              )}
            </div>
            {!collapsed && (
              <span className="flex items-center gap-0.5 shrink-0 ml-1">
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400 bg-white rounded border border-neutral-200/80 shadow-2xs font-sans leading-none">
                  {isMac ? "⌘" : "Ctrl"}
                </kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400 bg-white rounded border border-neutral-200/80 shadow-2xs font-sans leading-none">
                  K
                </kbd>
              </span>
            )}
          </button>
        </div>

        {/* Layer 3: Menu navigasi — SATU-SATUNYA BAGIAN SIDEBAR YANG BISA DI-SCROLL */}
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-4">
          {filteredNavGroups.map((grp) => (
            <div key={grp.group} className="space-y-1">
              {!collapsed && (
                <span className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
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
                      "relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group",
                      isActive
                        ? "bg-white text-lavender-700 font-semibold shadow-xs border border-neutral-200/60"
                        : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-lavender-600 rounded-r-md" />
                    )}

                    <Icon
                      size={20}
                      variant={isActive ? "Bold" : "Linear"}
                      className={cn(
                        "shrink-0 transition-colors",
                        isActive ? "text-lavender-600" : "text-neutral-500 group-hover:text-neutral-700"
                      )}
                    />

                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}

                    {!collapsed && item.badge !== undefined && (
                      <span
                        className={cn(
                          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold text-white tabular-nums",
                          item.badgeUrgent ? "bg-danger-600" : "bg-lavender-600"
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

        {/* Layer 4: Kartu profil admin — MENEMPEL DI BAWAH, SELALU TERLIHAT & BISA DIKLIK */}
        <div className="shrink-0 border-t border-neutral-200 p-3 bg-neutral-25 relative">
          {/* Popover upward */}
          {showProfilePopover && (
            <div className="absolute bottom-full mb-2 left-3 right-3 bg-white rounded-2xl border border-neutral-200 shadow-lg p-2 z-50 space-y-1 animate-in fade-in slide-from-bottom-2 duration-150">
              <Link
                href="/admin/settings?tab=profile"
                onClick={() => setShowProfilePopover(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Setting2 size={16} className="text-neutral-400" />
                <span>Pengaturan Akun</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setShowProfilePopover(false);
                  setShowLogoutConfirm(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-danger-600 hover:bg-danger-50 transition-colors text-left"
              >
                <LogoutCurve size={16} className="text-danger-500" />
                <span>Keluar</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowProfilePopover(!showProfilePopover)}
            className={cn(
              "w-full flex items-center justify-between p-2 rounded-xl hover:bg-neutral-100/80 transition-colors text-left",
              collapsed && "justify-center p-1.5"
            )}
            title={collapsed ? `${adminUser.name} (${adminUser.email})` : undefined}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {adminUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={adminUser.avatarUrl}
                  alt={adminUser.name}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-lavender-200"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-lavender-100 text-lavender-800 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-lavender-200">
                  {adminUser.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <div className="flex flex-col overflow-hidden leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-neutral-800 truncate">
                      {adminUser.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-lavender-100 text-lavender-700 font-semibold border border-lavender-200/60 shrink-0">
                      {isAdmin ? "Admin Utama" : (roleName || "Staf")}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500 truncate">
                    {adminUser.email}
                  </span>
                </div>
              )}
            </div>

            {!collapsed && (
              <ArrowUp2
                size={16}
                className={cn(
                  "text-neutral-400 transition-transform",
                  showProfilePopover && "rotate-180"
                )}
              />
            )}
          </button>
        </div>
      </aside>

      {/* 2. RIGHT CONTAINER: FIXED TOPBAR + SCROLLABLE MAIN CONTENT */}
      <div className="flex min-h-0 min-w-0 flex-col">
        {/* Topbar: Fixed at top of content area */}
        <header className="h-16 shrink-0 border-b border-neutral-200 bg-white sticky top-0 z-20 px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-neutral-600 hover:bg-neutral-100"
              title="Buka menu"
            >
              <HambergerMenu size={20} />
            </button>

            {/* Breadcrumb per spec: BuildMate › Halaman › Detail */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
              <span className="text-neutral-400">BuildMate</span>
              <span className="text-neutral-300">›</span>
              <span className="text-neutral-700 font-semibold">{getBreadcrumbTitle()}</span>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2.5">
            {/* Quick Search */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden sm:inline-flex items-center justify-between gap-3 px-3.5 py-1.5 w-44 md:w-56 rounded-xl border border-neutral-200/90 bg-neutral-50/80 hover:bg-white hover:border-neutral-300 text-xs text-neutral-600 transition-all shadow-2xs cursor-pointer group"
              title={`Pencarian Cepat (${isMac ? "⌘K" : "Ctrl+K"} atau /)`}
            >
              <div className="flex items-center gap-2 truncate">
                <SearchNormal1
                  size={14}
                  className="text-neutral-400 group-hover:text-lavender-600 transition-colors shrink-0"
                />
                <span className="text-neutral-400 group-hover:text-neutral-600 transition-colors truncate">
                  Cari cepat...
                </span>
              </div>
              <span className="flex items-center gap-0.5 shrink-0">
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400 bg-white rounded border border-neutral-200/80 shadow-2xs font-sans leading-none">
                  {isMac ? "⌘" : "Ctrl"}
                </kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400 bg-white rounded border border-neutral-200/80 shadow-2xs font-sans leading-none">
                  K
                </kbd>
              </span>
            </button>

            {/* Notification Button with dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 border border-neutral-200/70 transition-colors"
                title="Notifikasi"
              >
                <Notification size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger-600 ring-2 ring-white animate-pulse" />
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-neutral-200 shadow-lg p-3 z-50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <span className="text-xs font-bold text-neutral-800">Notifikasi Terbaru</span>
                    <span className="text-[10px] text-lavender-600 font-semibold">Tandai dibaca</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <Link
                      href="/admin/orders/ord-5"
                      onClick={() => setShowNotifications(false)}
                      className="block p-2 rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      <div className="font-semibold text-neutral-900">Komplain Garansi BM-0005</div>
                      <div className="text-neutral-500 text-[11px]">Siti Rahma mengajukan keluhan keramik</div>
                      <div className="text-neutral-400 text-[10px] mt-0.5">10 menit lalu</div>
                    </Link>
                    <Link
                      href="/admin/workers?tab=applications"
                      onClick={() => setShowNotifications(false)}
                      className="block p-2 rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      <div className="font-semibold text-neutral-900">Pendaftaran Mitra Baru</div>
                      <div className="text-neutral-500 text-[11px]">Agus Setiawan mengajukan pendaftaran</div>
                      <div className="text-neutral-400 text-[10px] mt-0.5">35 menit lalu</div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Avatar in Topbar */}
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
              <Link
                href="/admin/settings?tab=profile"
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs ring-1 ring-lavender-200 hover:ring-lavender-400 transition-all"
                title={`${adminUser.name} - Pengaturan Akun`}
              >
                {adminUser.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={adminUser.avatarUrl}
                    alt={adminUser.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-lavender-100 text-lavender-800 flex items-center justify-center">
                    {adminUser.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* 3. SCROLLABLE CONTENT AREA: ONLY THIS SCROLLS */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] px-6 py-6 xl:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* MOBILE DRAWER OVERLAY (< 1024px) */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-xs flex">
          <div className="w-72 bg-neutral-25 h-full flex flex-col p-4 shadow-2xl border-r border-neutral-200 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon.svg"
                  alt="BuildMate"
                  className="w-8 h-8 rounded-xl object-contain shadow-xs shrink-0"
                />
                <span className="font-bold text-sm text-neutral-900">BuildMate Admin</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <CloseCircle size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 space-y-4">
              {filteredNavGroups.map((grp) => (
                <div key={grp.group} className="space-y-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block px-2">
                    {grp.group}
                  </span>
                  {grp.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                          isActive
                            ? "bg-white text-lavender-700 font-semibold shadow-xs border border-neutral-200"
                            : "text-neutral-700 hover:bg-neutral-100"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={18} variant={isActive ? "Bold" : "Linear"} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-semibold text-white",
                              item.badgeUrgent ? "bg-danger-600" : "bg-lavender-600"
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

            <div className="pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-danger-600 hover:bg-danger-50 transition-colors"
              >
                <LogoutCurve size={18} />
                <span>Keluar dari Dashboard</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileDrawerOpen(false)} />
        </div>
      )}

      {/* LOGOUT CONFIRMATION DIALOG */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">Konfirmasi Keluar</h3>
              <p className="text-xs text-neutral-500">
                Apakah kamu yakin ingin keluar dari dashboard operasional BuildMate?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleLogout}
              >
                Ya, Keluar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND PALETTE MODAL (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <Suspense fallback={<div className="h-dvh w-dvw flex items-center justify-center bg-neutral-50 text-xs text-neutral-400">Memuat antarmuka admin...</div>}>
      <PermissionProvider>
        <AdminShellInner>{children}</AdminShellInner>
      </PermissionProvider>
    </Suspense>
  );
}
