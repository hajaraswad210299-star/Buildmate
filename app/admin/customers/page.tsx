"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { RequirePermission, PermissionGate } from "@/components/admin/PermissionGate";
import {
  Crown1,
  SearchNormal1,
  CloseCircle,
  Refresh,
  TickCircle,
  WhatsappIcon,
  Trash,
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

function CustomerAvatar({
  src,
  name,
  size = "sm",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "lg";
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const initials = name && name.trim() ? name.trim().slice(0, 2).toUpperCase() : "BM";

  if (src && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={
          size === "lg"
            ? "w-13 h-13 rounded-full object-cover border-2 border-lavender-200 shrink-0"
            : "w-7 h-7 rounded-full object-cover border border-neutral-200 shrink-0"
        }
      />
    );
  }

  return (
    <div
      className={
        size === "lg"
          ? "w-13 h-13 rounded-full bg-lavender-100 text-lavender-800 flex items-center justify-center font-bold text-lg shrink-0"
          : "w-7 h-7 rounded-full bg-lavender-100 text-lavender-700 font-bold flex items-center justify-center text-xs shrink-0"
      }
    >
      {initials}
    </div>
  );
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "plus" | "regular" | "real">("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerItem | null>(null);
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

  const handleDeleteCustomer = async (customer: CustomerItem) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/customers?id=${customer.id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus akun pelanggan");
      }

      toast.success(
        `Akun ${customer.name} berhasil dihapus permanen. Pengguna dapat mendaftar kembali secara mandiri.`
      );
      setCustomerToDelete(null);
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer(null);
      }
      fetchCustomers(true);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus akun pelanggan");
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
      <RequirePermission permission="customers.view">
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
                          <CustomerAvatar src={c.avatar_url} name={c.name} size="sm" />
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
                        <div className="flex items-center justify-center gap-1.5">
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomerToDelete(c);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                            title="Hapus akun pelanggan"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
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
                <CustomerAvatar
                  src={selectedCustomer.avatar_url}
                  name={selectedCustomer.name}
                  size="lg"
                />
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

              {/* ZONA HAPUS AKUN PELANGGAN */}
              <div className="p-3.5 rounded-2xl bg-danger-50/60 border border-danger-200/80 flex flex-col gap-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-danger-100 text-danger-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Trash size={15} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-danger-900 block">
                      Hapus Akun Pelanggan
                    </span>
                    <p className="text-[11px] text-danger-700 leading-relaxed mt-0.5">
                      Akun dan profil akan dihapus permanen. Pengguna ini dapat mendaftar kembali secara mandiri kapan saja seperti alur biasa.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setCustomerToDelete(selectedCustomer)}
                  className="w-full py-2 px-3 rounded-xl bg-danger-600 hover:bg-danger-700 active:bg-danger-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Trash size={14} />
                  <span>Hapus Akun Permanen</span>
                </button>
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

      {/* MODAL KONFIRMASI HAPUS AKUN */}
      {customerToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !actionLoading && setCustomerToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-danger-100 text-danger-700 flex items-center justify-center mb-4">
              <Trash size={24} />
            </div>

            <h3 className="text-lg font-bold text-neutral-900 mb-1">
              Hapus Akun Pelanggan?
            </h3>

            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              Apakah kamu yakin ingin menghapus akun{" "}
              <strong className="text-neutral-900">{customerToDelete.name}</strong>{" "}
              (<span className="font-mono text-neutral-700">{customerToDelete.email}</span>)?
            </p>

            <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 mb-5 text-[11px] text-neutral-600 space-y-1.5">
              <p className="font-semibold text-neutral-800">Setelah akun dihapus:</p>
              <ul className="list-disc list-inside space-y-1 text-neutral-500">
                <li>Data profil dan riwayat pesanan/membership dihapus dari sistem.</li>
                <li>Akun di Supabase Auth dihapus secara permanen.</li>
                <li>
                  <span className="text-emerald-700 font-semibold">Pengguna dapat mendaftar lagi</span>{" "}
                  secara mandiri (Google / Email) seperti alur biasa.
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                disabled={actionLoading}
                onClick={() => setCustomerToDelete(null)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="md"
                className="flex-1"
                disabled={actionLoading}
                onClick={() => handleDeleteCustomer(customerToDelete)}
              >
                {actionLoading ? "Menghapus..." : "Ya, Hapus Akun"}
              </Button>
            </div>
          </div>
        </div>
      )}
      </RequirePermission>
    </AdminShell>
  );
}
