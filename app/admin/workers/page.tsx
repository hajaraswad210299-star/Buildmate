"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PhotoLightbox } from "@/components/shared/PhotoLightbox";
import {
  getWorkers,
  WorkerFilter,
  saveWorker,
  reviewWorkerApplication,
  toggleWorkerActive,
} from "@/lib/data/workers";
import { getPackages } from "@/lib/data/services";
import { Worker, ServicePackage } from "@/lib/data/types";
import { formatDateId, slugify } from "@/lib/format";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { Button } from "@/components/shared/Button";
import { toast } from "sonner";
import {
  SearchNormal1,
  AddCircle,
  Verify,
  Edit2,
  CloseCircle,
  ArrowRight,
} from "@/lib/icons";
import { FilterDropdown } from "@/components/shared/FilterDropdown";

const SERVICE_AREA_OPTIONS = [
  { value: "Jakarta Selatan", label: "Jakarta Selatan" },
  { value: "Jakarta Timur", label: "Jakarta Timur" },
  { value: "Jakarta Barat", label: "Jakarta Barat" },
  { value: "Jakarta Pusat", label: "Jakarta Pusat" },
  { value: "Jakarta Utara", label: "Jakarta Utara" },
];

export default function AdminWorkersPage() {
  const [activeTab, setActiveTab] = useState<WorkerFilter["tab"]>("active");
  const [search, setSearch] = useState("");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);

  // Drawer Tambah/Edit
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Partial<Worker> | null>(null);

  // Drawer Review Pendaftaran
  const [reviewingWorker, setReviewingWorker] = useState<Worker | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewIsVerified, setReviewIsVerified] = useState(true);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const loadData = React.useCallback(() => {
    getWorkers({ tab: activeTab, search }).then((res) => setWorkers(res));
    getPackages().then((res) => setPackages(res));
  }, [activeTab, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddDrawer = () => {
    setEditingWorker({
      full_name: "",
      slug: "",
      phone: "628",
      service_area: "Jakarta Selatan",
      experience_years: 3,
      bio: "",
      is_verified: true,
      is_active: true,
      package_ids: [],
    });
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (w: Worker) => {
    setEditingWorker({ ...w });
    setIsDrawerOpen(true);
  };

  const handleSaveWorker = async () => {
    if (!editingWorker?.full_name?.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }
    try {
      await saveWorker(editingWorker as Parameters<typeof saveWorker>[0]);
      toast.success("Data tukang berhasil disimpan ke database");
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data tukang ke database");
    }
  };

  const handleToggleActive = async (workerId: string) => {
    try {
      const res = await toggleWorkerActive(workerId);
      if (res.success) {
        toast.success(
          res.is_active
            ? "Tukang diaktifkan kembali"
            : "Tukang dinonaktifkan sementara",
          {
            action: {
              label: "Urungkan",
              onClick: () => toggleWorkerActive(workerId).then(loadData),
            },
          }
        );
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status tukang");
    }
  };

  const handleReview = async (approved: boolean) => {
    if (!reviewingWorker) return;
    if (!approved && !reviewReason.trim()) {
      toast.error("Alasan penolakan pendaftaran wajib diisi");
      return;
    }

    try {
      await reviewWorkerApplication(
        reviewingWorker.id,
        approved,
        reviewReason,
        reviewIsVerified
      );

      toast.success(
        approved
          ? `Pendaftaran ${reviewingWorker.full_name} disetujui!`
          : `Pendaftaran ${reviewingWorker.full_name} ditolak.`
      );
      setReviewingWorker(null);
      setReviewReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses review pendaftaran");
    }
  };

  return (
    <AdminShell>
      <div className="space-y-5">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                Kelola Mitra Tukang
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-semibold tabular-nums">
                {workers.length} mitra
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Verifikasi pendaftaran mandiri, kelola profil tukang, dan atur katalog paket
            </p>
          </div>

          <Button
            variant="primary"
            onClick={handleOpenAddDrawer}
            leftIcon={<AddCircle size={16} variant="Bold" />}
          >
            Tambah Tukang
          </Button>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-1 border-b border-neutral-200/80 pb-px">
          {[
            { id: "active", label: "Aktif" },
            { id: "applications", label: "Pendaftaran Menunggu", badge: 1 },
            { id: "inactive", label: "Nonaktif & Ditolak" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as "active" | "applications" | "inactive")}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-lavender-600 text-lavender-700 font-semibold"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.5 rounded-full bg-lavender-100 text-lavender-700 text-[10px] font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <SearchNormal1
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, area, atau keahlian..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-neutral-200 text-xs placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-lavender-300"
            />
          </div>
        </div>

        {/* TAB 1: AKTIF */}
        {activeTab === "active" && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                    <th className="py-3 px-4 font-medium">Mitra Tukang</th>
                    <th className="py-3 px-3 font-medium">Area Layanan</th>
                    <th className="py-3 px-3 font-medium">Pengalaman</th>
                    <th className="py-3 px-3 font-medium">Verifikasi</th>
                    <th className="py-3 px-3 font-medium">Jenis Akun</th>
                    <th className="py-3 px-3 font-medium text-center">Pesanan Selesai</th>
                    <th className="py-3 px-3 font-medium text-center">Status Aktif</th>
                    <th className="py-3 px-4 text-center font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {workers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-400">
                        Tidak ada data mitra aktif.
                      </td>
                    </tr>
                  ) : (
                    workers.map((w) => (
                      <tr key={w.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                w.photo_path ||
                                "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=100"
                              }
                              alt={w.full_name}
                              className="w-9 h-9 rounded-full object-cover border border-neutral-200 shrink-0"
                            />
                            <div>
                              <span className="font-semibold text-neutral-800 block">
                                {w.full_name}
                              </span>
                              <span className="text-[11px] text-neutral-400 font-mono">
                                /{w.slug}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-neutral-700 font-medium">
                          {w.service_area}
                        </td>

                        <td className="py-3.5 px-3 text-neutral-600">
                          {w.experience_years} tahun
                        </td>

                        <td className="py-3.5 px-3">
                          {w.is_verified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-lavender-700 bg-lavender-50 px-2 py-0.5 rounded-full">
                              <Verify size={13} variant="Bold" />
                              <span>Terverifikasi</span>
                            </span>
                          ) : (
                            <span className="text-neutral-400 text-[11px]">Belum</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="text-[11px] text-neutral-600">
                            {w.user_id ? "Mitra Berakun" : "Dikelola Admin"}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center font-semibold text-neutral-800 tabular-nums">
                          {w.completed_jobs_count || 0}
                        </td>

                        {/* Switch toggle */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(w.id)}
                            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                              w.is_active ? "bg-lavender-600" : "bg-neutral-300"
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full bg-white block transition-transform shadow-xs ${
                                w.is_active ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDrawer(w)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-lavender-600 hover:bg-lavender-50 transition-colors"
                            title="Edit Tukang"
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PENDAFTARAN MENUNGGU (REVIEW DRAWER) */}
        {activeTab === "applications" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-neutral-400">
                Tidak ada pendaftaran mitra baru yang menunggu peninjauan.
              </div>
            ) : (
              workers.map((w) => (
                <div
                  key={w.id}
                  className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          w.photo_path ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
                        }
                        alt={w.full_name}
                        className="w-12 h-12 rounded-full object-cover border border-neutral-200 shrink-0"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-neutral-800">{w.full_name}</h4>
                        <span className="text-xs text-neutral-500 block">
                          Area: {w.service_area} · {w.experience_years} th pengalaman
                        </span>
                        <span className="text-[10px] text-neutral-400 block mt-0.5">
                          Mendaftar <RelativeTime date={w.created_at} />
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 line-clamp-2">
                      {w.bio || "Tidak ada deskripsi bio."}
                    </p>

                    {/* Portofolio thumbnails */}
                    {w.portfolio_paths && w.portfolio_paths.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-400">Portofolio:</span>
                        {w.portfolio_paths.map((p, idx) => (
                          <div
                            key={idx}
                            onClick={() => setLightboxUrl(p)}
                            className="w-8 h-8 rounded-lg overflow-hidden border border-neutral-200 cursor-pointer shadow-xs"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p} alt="Portofolio" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setReviewingWorker(w)}
                    className="w-full py-2 rounded-xl bg-lavender-50 hover:bg-lavender-100 text-lavender-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Tinjau Pendaftaran</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: NONAKTIF & DITOLAK */}
        {activeTab === "inactive" && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                    <th className="py-3 px-4 font-medium">Nama Mitra</th>
                    <th className="py-3 px-3 font-medium">Status Aplikasi</th>
                    <th className="py-3 px-3 font-medium">Alasan / Catatan</th>
                    <th className="py-3 px-3 font-medium">Tanggal</th>
                    <th className="py-3 px-4 text-center font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {workers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-400">
                        Tidak ada data mitra nonaktif atau ditolak.
                      </td>
                    </tr>
                  ) : (
                    workers.map((w) => (
                      <tr key={w.id} className="hover:bg-neutral-50/60">
                        <td className="py-3.5 px-4 font-semibold text-neutral-800">
                          {w.full_name}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              w.application_status === "rejected"
                                ? "bg-danger-50 text-danger-700"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {w.application_status === "rejected" ? "Ditolak" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-neutral-600 max-w-xs truncate">
                          {w.rejection_reason || "Dinonaktifkan sementara oleh admin."}
                        </td>
                        <td className="py-3.5 px-3 text-neutral-400">
                          {formatDateId(w.created_at)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(w.id)}
                            className="px-3 py-1 rounded-lg bg-neutral-100 hover:bg-lavender-50 hover:text-lavender-700 text-neutral-700 text-xs font-semibold"
                          >
                            Aktifkan Kembali
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* DRAWER TAMBAH / EDIT TUKANG */}
      {isDrawerOpen && editingWorker && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="text-base font-bold text-neutral-900">
                  {editingWorker.id ? "Edit Data Tukang" : "Tambah Tukang Baru"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <CloseCircle size={20} />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Nama Lengkap <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingWorker.full_name || ""}
                    onChange={(e) => {
                      const name = e.target.value;
                      setEditingWorker({
                        ...editingWorker,
                        full_name: name,
                        slug: slugify(name),
                      });
                    }}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>

                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Slug Profil Publik
                  </label>
                  <input
                    type="text"
                    value={editingWorker.slug || ""}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, slug: slugify(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-600 font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Nomor WhatsApp (+62)
                  </label>
                  <input
                    type="text"
                    value={editingWorker.phone || ""}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, phone: e.target.value })
                    }
                    placeholder="6281234567890"
                    className="w-full p-2.5 rounded-xl border border-neutral-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-neutral-700 block mb-1">
                      Area Layanan
                    </label>
                    <FilterDropdown
                      value={editingWorker.service_area || "Jakarta Selatan"}
                      options={SERVICE_AREA_OPTIONS}
                      onChange={(val) =>
                        setEditingWorker({ ...editingWorker, service_area: val })
                      }
                      fullWidth
                      size="md"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-neutral-700 block mb-1">
                      Pengalaman (Tahun)
                    </label>
                    <input
                      type="number"
                      value={editingWorker.experience_years || 1}
                      onChange={(e) =>
                        setEditingWorker({
                          ...editingWorker,
                          experience_years: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full p-2.5 rounded-xl border border-neutral-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Bio & Keahlian Singkat (Maks. 300 Karakter)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={editingWorker.bio || ""}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, bio: e.target.value })
                    }
                    placeholder="Spesialisasi pipa, perbaikan keran, dll..."
                    className="w-full p-2.5 rounded-xl border border-neutral-200 resize-none"
                  />
                  <span className="text-[10px] text-neutral-400 block text-right">
                    {(editingWorker.bio || "").length}/300
                  </span>
                </div>

                {/* Paket yang dilayani */}
                <div>
                  <label className="font-medium text-neutral-700 block mb-1.5">
                    Paket Layanan yang Disediakan
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-neutral-200 bg-neutral-50/50">
                    {packages.map((pkg) => {
                      const isSelected = editingWorker.package_ids?.includes(pkg.id);
                      return (
                        <label
                          key={pkg.id}
                          className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const currentIds = editingWorker.package_ids || [];
                              if (e.target.checked) {
                                setEditingWorker({
                                  ...editingWorker,
                                  package_ids: [...currentIds, pkg.id],
                                });
                              } else {
                                setEditingWorker({
                                  ...editingWorker,
                                  package_ids: currentIds.filter((id) => id !== pkg.id),
                                });
                              }
                            }}
                            className="rounded text-lavender-600 focus:ring-lavender-300"
                          />
                          <span>
                            {pkg.name} ({pkg.category_name})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Switch Verifikasi */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100 mt-2">
                  <div>
                    <span className="font-semibold text-neutral-800 block">
                      Tandai Terverifikasi
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Tampilkan lencana centang verifikasi lavender
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingWorker.is_verified}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, is_verified: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-lavender-600 focus:ring-lavender-300"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Drawer Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsDrawerOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveWorker}
              >
                Simpan Tukang
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER REVIEW PENDAFTARAN MITRA */}
      {reviewingWorker && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end"
          onClick={() => setReviewingWorker(null)}
        >
          <div
            className="w-full max-w-lg bg-white h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="text-base font-bold text-neutral-900">
                  Tinjau Berkas Pendaftaran Mitra
                </h3>
                <button
                  type="button"
                  onClick={() => setReviewingWorker(null)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <CloseCircle size={20} />
                </button>
              </div>

              {/* Data Profil Pendaftar */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center gap-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    reviewingWorker.photo_path ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
                  }
                  alt={reviewingWorker.full_name}
                  className="w-14 h-14 rounded-full object-cover border border-neutral-200"
                />
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">
                    {reviewingWorker.full_name}
                  </h4>
                  <span className="text-xs text-neutral-500 block">
                    {reviewingWorker.email || "-"} · {reviewingWorker.phone}
                  </span>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">
                    Area: {reviewingWorker.service_area} · {reviewingWorker.experience_years} th pengalaman
                  </span>
                </div>
              </div>

              {/* Bio */}
              <div>
                <span className="text-xs font-semibold text-neutral-700 block mb-1">
                  Deskripsi Bio:
                </span>
                <p className="text-xs text-neutral-700 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                  {reviewingWorker.bio}
                </p>
              </div>

              {/* Portofolio Gallery */}
              {reviewingWorker.portfolio_paths && reviewingWorker.portfolio_paths.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-neutral-700 block mb-2">
                    Foto Portofolio yang Diunggah:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {reviewingWorker.portfolio_paths.map((p, i) => (
                      <div
                        key={i}
                        onClick={() => setLightboxUrl(p)}
                        className="h-28 rounded-xl overflow-hidden border border-neutral-200 cursor-pointer shadow-xs"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p} alt="Portofolio" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified switch */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs cursor-pointer">
                <span className="font-semibold text-neutral-800">
                  Berikan Lencana Terverifikasi
                </span>
                <input
                  type="checkbox"
                  checked={reviewIsVerified}
                  onChange={(e) => setReviewIsVerified(e.target.checked)}
                  className="w-4 h-4 rounded text-lavender-600 focus:ring-lavender-300"
                />
              </label>

              {/* Rejection reason (if rejecting) */}
              <div>
                <label className="text-xs font-medium text-neutral-700 block mb-1">
                  Alasan Penolakan (Wajib jika menolak)
                </label>
                <textarea
                  rows={2}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="Misal: Foto portofolio buram atau nomor WA tidak aktif"
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 resize-none"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
              <Button
                variant="destructive"
                size="md"
                onClick={() => handleReview(false)}
              >
                Tolak Pendaftaran
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => handleReview(true)}
              >
                Setujui & Publikasikan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lightboxUrl && (
        <PhotoLightbox
          isOpen={!!lightboxUrl}
          onClose={() => setLightboxUrl(null)}
          imageUrl={lightboxUrl}
          title="Pratinjau Portofolio Tukang"
        />
      )}
    </AdminShell>
  );
}
