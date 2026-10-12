"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  Crown1,
  SearchNormal1,
  CloseCircle,
  Refresh,
  TickCircle,
  WhatsappIcon,
} from "@/lib/icons";
import { formatRupiah, formatDateId } from "@/lib/format";
import { Button } from "@/components/shared/Button";
import { toast } from "sonner";

export interface CustomerItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string | null;
  is_plus: boolean;
  plus_expires_at?: string;
  order_count: number;
  total_spent: number;
  created_at: string;
  is_real: boolean;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "plus" | "regular" | "real">("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCustomers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Gagal memuat data pelanggan");
      }
      const data = await res.json();
      if (data?.customers) {
        setCustomers(data.customers);
      }
    } catch (err: any) {
      console.error("Error fetching customers:", err);
      toast.error(err.message || "Gagal mengambil data pelanggan");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleTogglePlus = async (customer: CustomerItem, grant: boolean) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          action: grant ? "grant_plus" : "revoke_plus",
          days: 30,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData?.error || "Gagal mengubah status membership");
      }

      toast.success(resData.message || "Status membership berhasil diperbarui");

      // Update state locally
      const updatedCustomer: CustomerItem = {
        ...customer,
        is_plus: grant,
        plus_expires_at: grant ? resData.expires_at : undefined,
      };

      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? updatedCustomer : c))
      );
      setSelectedCustomer(updatedCustomer);
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q);

    if (!matchSearch) return false;

    if (filterType === "plus") return c.is_plus;
    if (filterType === "regular") return !c.is_plus;
    if (filterType === "real") return c.is_real;

    return true;
  });

  const plusCount = customers.filter((c) => c.is_plus).length;
  const realCount = customers.filter((c) => c.is_real).length;

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
              Data Pelanggan & Member Plus
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Daftar pengguna terdaftar (Google & Email), status keanggotaan BuildMate Plus, dan akumulasi transaksi
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchCustomers(true)}
            disabled={loading || refreshing}
            className="self-start sm:self-auto gap-1.5"
          >
            <Refresh
              size={14}
              className={refreshing ? "animate-spin text-lavender-700" : "text-neutral-500"}
            />
            <span>{refreshing ? "Menyegarkan..." : "Segarkan Data"}</span>
          </Button>
        </div>

        {/* TOOLBAR & FILTERS */}
        <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-72">
              <SearchNormal1
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, no HP..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-lavender-500"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                  filterType === "all"
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                Semua ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("real")}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                  filterType === "real"
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                Akun Terdaftar ({realCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("plus")}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1 ${
                  filterType === "plus"
                    ? "bg-lavender-700 text-white"
                    : "bg-lavender-50 text-lavender-700 hover:bg-lavender-100"
                }`}
              >
                <Crown1 size={13} variant="Bold" />
                <span>Member Plus ({plusCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType("regular")}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                  filterType === "regular"
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                Reguler ({customers.length - plusCount})
              </button>
            </div>
          </div>

          <span className="text-xs text-neutral-400 font-medium">
            Menampilkan {filtered.length} pelanggan
          </span>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                  <th className="py-3 px-4 font-medium">Nama Pelanggan</th>
                  <th className="py-3 px-3 font-medium">Email</th>
                  <th className="py-3 px-3 font-medium">No. WhatsApp</th>
                  <th className="py-3 px-3 font-medium text-center">Status Membership</th>
                  <th className="py-3 px-3 font-medium text-center">Tipe Akun</th>
                  <th className="py-3 px-3 font-medium text-center">Total Pesanan</th>
                  <th className="py-3 px-3 font-medium text-right">Total Belanja</th>
                  <th className="py-3 px-3 font-medium text-right">Terdaftar Sejak</th>
                  <th className="py-3 px-4 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`skel-${i}`} className="animate-pulse">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-neutral-200" />
                          <div className="h-3 w-28 bg-neutral-200 rounded" />
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="h-3 w-32 bg-neutral-200 rounded" />
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="h-3 w-24 bg-neutral-200 rounded" />
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="h-4 w-20 bg-neutral-200 rounded-full mx-auto" />
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="h-4 w-16 bg-neutral-200 rounded-full mx-auto" />
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="h-3 w-8 bg-neutral-200 rounded mx-auto" />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="h-3 w-16 bg-neutral-200 rounded ml-auto" />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="h-3 w-20 bg-neutral-200 rounded ml-auto" />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="h-6 w-12 bg-neutral-200 rounded mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-neutral-400">
                      Tidak ada pelanggan yang cocok dengan pencarian / filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomer(c)}
                      className="hover:bg-neutral-50/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {c.avatar_url ? (
                            <Image
                              src={c.avatar_url}
                              alt={c.name}
                              width={28}
                              height={28}
                              className="w-7 h-7 rounded-full object-cover border border-neutral-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-lavender-100 text-lavender-700 font-bold flex items-center justify-center text-xs">
                              {c.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-800">{c.name}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-neutral-600 font-mono text-[11px]">
                        {c.email}
                      </td>
                      <td className="py-3.5 px-3 text-neutral-600">
                        {c.phone && c.phone !== "-" ? (
                          <span className="font-mono text-[11px]">{c.phone}</span>
                        ) : (
                          <span className="text-neutral-400 italic">Belum diisi</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {c.is_plus ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-lavender-100 text-lavender-700">
                            <Crown1 size={13} variant="Bold" />
                            <span>Member Plus</span>
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">Reguler (Gratis)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {c.is_real ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <TickCircle size={11} variant="Bold" />
                            <span>Akun Asli</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-neutral-400 bg-neutral-100">
                            Simulasi
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center font-semibold text-neutral-800 tabular-nums">
                        {c.order_count}
                      </td>

                      <td className="py-3.5 px-3 font-bold text-neutral-900 tabular-nums text-right">
                        {formatRupiah(c.total_spent)}
                      </td>

                      <td className="py-3.5 px-3 text-neutral-400 text-right">
                        {formatDateId(c.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(c);
                          }}
                          className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-semibold transition-colors"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DRAWER CUSTOMER DETAIL */}
      {selectedCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="w-full max-w-md bg-white h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900">
                    Detail Profil Pelanggan
                  </h3>
                  {selectedCustomer.is_real && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Akun Asli
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <CloseCircle size={20} />
                </button>
              </div>

              {/* CARD PROFIL */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center gap-3.5">
                {selectedCustomer.avatar_url ? (
                  <Image
                    src={selectedCustomer.avatar_url}
                    alt={selectedCustomer.name}
                    width={52}
                    height={52}
                    className="w-13 h-13 rounded-full object-cover border-2 border-lavender-200 shrink-0"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-full bg-lavender-100 text-lavender-800 flex items-center justify-center font-bold text-lg shrink-0">
                    {selectedCustomer.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-neutral-900 text-base truncate">
                    {selectedCustomer.name}
                  </h4>
                  <span className="text-xs text-neutral-500 block truncate font-mono">
                    {selectedCustomer.email}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-neutral-700 font-medium font-mono">
                      {selectedCustomer.phone && selectedCustomer.phone !== "-"
                        ? selectedCustomer.phone
                        : "Nomor HP belum diisi"}
                    </span>
                    {selectedCustomer.phone && selectedCustomer.phone !== "-" && (
                      <a
                        href={`https://wa.me/${selectedCustomer.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md"
                      >
                        <WhatsappIcon size={12} />
                        <span>Chat WA</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* MEMBERSHIP STATUS & ACTION */}
              <div className="p-4 rounded-2xl border border-neutral-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700">
                    Status Keanggotaan
                  </span>
                  {selectedCustomer.is_plus ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-lavender-100 text-lavender-800">
                      <Crown1 size={14} variant="Bold" />
                      <span>BuildMate Plus Aktif</span>
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500 font-medium">
                      Reguler (Gratis)
                    </span>
                  )}
                </div>

                {selectedCustomer.is_plus && selectedCustomer.plus_expires_at && (
                  <p className="text-[11px] text-neutral-500">
                    Berlaku s.d.{" "}
                    <span className="font-semibold text-neutral-800">
                      {formatDateId(selectedCustomer.plus_expires_at, "d MMMM yyyy")}
                    </span>
                  </p>
                )}

                <div className="pt-2 border-t border-neutral-100 flex items-center gap-2">
                  {selectedCustomer.is_plus ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleTogglePlus(selectedCustomer, false)}
                      className="w-full text-rose-600 hover:text-rose-700 border-rose-200 text-xs"
                    >
                      {actionLoading ? "Memproses..." : "Nonaktifkan Status Plus"}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleTogglePlus(selectedCustomer, true)}
                      className="w-full text-xs gap-1.5"
                    >
                      <Crown1 size={14} variant="Bold" />
                      <span>{actionLoading ? "Memproses..." : "Berikan Akses Plus (30 Hari)"}</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* STATISTIK PESANAN */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-400 block">Total Pesanan:</span>
                  <span className="font-bold text-neutral-900 text-lg mt-0.5 block tabular-nums">
                    {selectedCustomer.order_count}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-400 block">Total Belanja:</span>
                  <span className="font-bold text-lavender-700 text-lg mt-0.5 block tabular-nums">
                    {formatRupiah(selectedCustomer.total_spent)}
                  </span>
                </div>
              </div>

              {/* INFO SISTEM */}
              <div className="text-[11px] text-neutral-400 space-y-1">
                <p>
                  ID Pengguna: <span className="font-mono text-neutral-600">{selectedCustomer.id}</span>
                </p>
                <p>
                  Terdaftar sejak:{" "}
                  <span className="text-neutral-600">
                    {formatDateId(selectedCustomer.created_at, "d MMMM yyyy, HH:mm")} WIB
                  </span>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100">
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => setSelectedCustomer(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
