"use client";

import React, { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Crown1, SearchNormal1, CloseCircle } from "@/lib/icons";
import { formatRupiah, formatDateId } from "@/lib/format";
import { Button } from "@/components/shared/Button";

interface CustomerItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_plus: boolean;
  plus_expires_at?: string;
  order_count: number;
  total_spent: number;
  created_at: string;
}

const MOCK_CUSTOMERS: CustomerItem[] = [
  {
    id: "cust-1",
    name: "Siti Rahmawati",
    email: "siti.rahma@gmail.com",
    phone: "628119876543",
    is_plus: true,
    plus_expires_at: "2026-11-04T10:00:00Z",
    order_count: 5,
    total_spent: 850000,
    created_at: "2026-08-12T09:00:00Z",
  },
  {
    id: "cust-2",
    name: "Dimas Anggara",
    email: "dimas.anggara@gmail.com",
    phone: "628128889991",
    is_plus: false,
    order_count: 2,
    total_spent: 505000,
    created_at: "2026-09-01T14:20:00Z",
  },
  {
    id: "cust-3",
    name: "Kartika Putri",
    email: "kartika.p@gmail.com",
    phone: "628571234888",
    is_plus: false,
    order_count: 1,
    total_spent: 205000,
    created_at: "2026-10-09T10:00:00Z",
  },
  {
    id: "cust-4",
    name: "Hendra Wijaya",
    email: "hendra.w@gmail.com",
    phone: "628123344556",
    is_plus: true,
    plus_expires_at: "2026-10-28T08:00:00Z",
    order_count: 3,
    total_spent: 420000,
    created_at: "2026-09-15T11:00:00Z",
  },
];

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);

  const filtered = MOCK_CUSTOMERS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <AdminShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            Data Pelanggan & Member Plus
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Daftar pengguna terdaftar, status keanggotaan BuildMate Plus, dan akumulasi transaksi
          </p>
        </div>

        {/* TOOLBAR */}
        <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center justify-between gap-3">
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
              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-neutral-200 text-xs"
            />
          </div>
          <span className="text-xs text-neutral-400 font-medium">
            Total {filtered.length} pelanggan
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
                  <th className="py-3 px-3 font-medium text-center">Total Pesanan</th>
                  <th className="py-3 px-3 font-medium text-right">Total Belanja</th>
                  <th className="py-3 px-3 font-medium text-right">Terdaftar Sejak</th>
                  <th className="py-3 px-4 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className="hover:bg-neutral-50/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-lavender-100 text-lavender-700 font-bold flex items-center justify-center text-xs">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-neutral-800">{c.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-neutral-600">{c.email}</td>
                    <td className="py-3.5 px-3 text-neutral-600">{c.phone}</td>

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
                        className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-semibold"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
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
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="text-base font-bold text-neutral-900">
                  Detail Profil Pelanggan
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <CloseCircle size={20} />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-lavender-100 text-lavender-800 flex items-center justify-center font-bold text-base shrink-0">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">{selectedCustomer.name}</h4>
                  <span className="text-xs text-neutral-500 block">
                    {selectedCustomer.email}
                  </span>
                  <span className="text-xs text-neutral-600 font-medium block mt-0.5">
                    {selectedCustomer.phone}
                  </span>
                </div>
              </div>

              {selectedCustomer.is_plus && (
                <div className="p-3.5 rounded-xl bg-lavender-50 border border-lavender-200 text-xs text-lavender-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Crown1 size={15} variant="Bold" />
                    <span>BuildMate Plus Aktif</span>
                  </div>
                  <p className="text-[11px] text-lavender-700">
                    Berlaku s.d.{" "}
                    {selectedCustomer.plus_expires_at
                      ? formatDateId(selectedCustomer.plus_expires_at, "d MMMM yyyy")
                      : "-"}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-400 block">Total Pesanan:</span>
                  <span className="font-bold text-neutral-900 text-base mt-0.5 block tabular-nums">
                    {selectedCustomer.order_count}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-400 block">Total Belanja:</span>
                  <span className="font-bold text-lavender-700 text-base mt-0.5 block tabular-nums">
                    {formatRupiah(selectedCustomer.total_spent)}
                  </span>
                </div>
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
