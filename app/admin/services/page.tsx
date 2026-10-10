"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  getCategories,
  getPackages,
  saveCategory,
  savePackage,
} from "@/lib/data/services";
import { Category, ServicePackage } from "@/lib/data/types";
import { formatRupiah, slugify } from "@/lib/format";
import { Button } from "@/components/shared/Button";
import { toast } from "sonner";
import {
  AddCircle,
  Edit2,
  Drop,
  Brush2,
  Ruler,
  Wind,
  Setting4,
  CloseCircle,
} from "@/lib/icons";

export default function AdminServicesPage() {
  const [activeTab, setActiveTab] = useState<"categories" | "packages">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);

  // Drawer Category
  const [isCatDrawerOpen, setIsCatDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  // Drawer Package
  const [isPkgDrawerOpen, setIsPkgDrawerOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Partial<ServicePackage> | null>(null);
  const [inclusionsInput, setInclusionsInput] = useState("");
  const [exclusionsInput, setExclusionsInput] = useState("");

  const loadData = () => {
    getCategories().then((res) => setCategories(res));
    getPackages().then((res) => setPackages(res));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddCategory = () => {
    setEditingCategory({
      name: "",
      slug: "",
      icon: "Setting4",
      is_active: true,
    });
    setIsCatDrawerOpen(true);
  };

  const handleOpenAddPackage = () => {
    setEditingPackage({
      name: "",
      category_id: categories[0]?.id || "",
      price: 150000,
      est_duration_minutes: 60,
      inclusions: ["Pembersihan area", "Pemasangan komponen presisi"],
      exclusions: ["Material sparepart baru"],
      is_active: true,
    });
    setInclusionsInput("");
    setExclusionsInput("");
    setIsPkgDrawerOpen(true);
  };

  const handleSaveCat = async () => {
    if (!editingCategory?.name?.trim()) {
      toast.error("Nama kategori wajib diisi");
      return;
    }
    await saveCategory(editingCategory as Parameters<typeof saveCategory>[0]);
    toast.success("Kategori layanan berhasil disimpan");
    setIsCatDrawerOpen(false);
    loadData();
  };

  const handleSavePkg = async () => {
    if (!editingPackage?.name?.trim() || !editingPackage?.price) {
      toast.error("Nama paket dan harga wajib diisi");
      return;
    }
    await savePackage(editingPackage as Parameters<typeof savePackage>[0]);
    toast.success("Paket layanan berhasil disimpan");
    setIsPkgDrawerOpen(false);
    loadData();
  };

  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "Drop":
        return <Drop size={20} className="text-info-600" />;
      case "Brush2":
        return <Brush2 size={20} className="text-lavender-600" />;
      case "Ruler":
        return <Ruler size={20} className="text-warning-600" />;
      case "Wind":
        return <Wind size={20} className="text-teal-600" />;
      default:
        return <Setting4 size={20} className="text-neutral-500" />;
    }
  };

  return (
    <AdminShell>
      <div className="space-y-5">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
              Katalog Layanan & Paket
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Atur daftar kategori keahlian, paket harga tetap (fixed-price), dan cakupan kerja
            </p>
          </div>

          <button
            type="button"
            onClick={activeTab === "categories" ? handleOpenAddCategory : handleOpenAddPackage}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <AddCircle size={16} />
            <span>{activeTab === "categories" ? "Tambah Kategori" : "Tambah Paket"}</span>
          </button>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-1 border-b border-neutral-200/80 pb-px">
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === "categories"
                ? "border-lavender-600 text-lavender-700 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Kategori ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("packages")}
            className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === "packages"
                ? "border-lavender-600 text-lavender-700 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Paket Layanan ({packages.length})
          </button>
        </div>

        {/* TAB 1: KATEGORI */}
        {activeTab === "categories" && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                  <th className="py-3 px-4 font-medium">Ikon</th>
                  <th className="py-3 px-3 font-medium">Nama Kategori</th>
                  <th className="py-3 px-3 font-medium">Slug</th>
                  <th className="py-3 px-3 font-medium text-center">Jumlah Paket</th>
                  <th className="py-3 px-3 font-medium text-center">Status</th>
                  <th className="py-3 px-4 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-neutral-50/60">
                    <td className="py-3 px-4">
                      <div className="w-9 h-9 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center">
                        {renderCategoryIcon(cat.icon)}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-neutral-800">
                      {cat.name}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-400">
                      /{cat.slug}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-neutral-700 tabular-nums">
                      {cat.package_count || 0} paket
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          cat.is_active
                            ? "bg-success-50 text-success-700"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {cat.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(cat);
                          setIsCatDrawerOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-lavender-600 hover:bg-lavender-50 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: PAKET */}
        {activeTab === "packages" && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                  <th className="py-3 px-4 font-medium">Nama Paket</th>
                  <th className="py-3 px-3 font-medium">Kategori</th>
                  <th className="py-3 px-3 font-medium text-right">Harga Tetap</th>
                  <th className="py-3 px-3 font-medium text-center">Estimasi Durasi</th>
                  <th className="py-3 px-3 font-medium text-center">Tukang Terdaftar</th>
                  <th className="py-3 px-3 font-medium text-center">Status</th>
                  <th className="py-3 px-4 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-neutral-50/60">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-neutral-800 block">
                        {pkg.name}
                      </span>
                      <span className="text-[11px] text-neutral-400 line-clamp-1">
                        {pkg.description}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-neutral-600">
                      {pkg.category_name}
                    </td>
                    <td className="py-3 px-3 font-bold text-neutral-900 tabular-nums text-right">
                      {formatRupiah(pkg.price)}
                    </td>
                    <td className="py-3 px-3 text-center text-neutral-600 tabular-nums">
                      {pkg.est_duration_minutes} menit
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-neutral-700 tabular-nums">
                      {pkg.worker_count || 0}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          pkg.is_active
                            ? "bg-success-50 text-success-700"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {pkg.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPackage(pkg);
                          setIsPkgDrawerOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-lavender-600 hover:bg-lavender-50 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DRAWER KATEGORI */}
      {isCatDrawerOpen && editingCategory && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end"
          onClick={() => setIsCatDrawerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="text-base font-bold text-neutral-900">
                  {editingCategory.id ? "Edit Kategori" : "Tambah Kategori Baru"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCatDrawerOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <CloseCircle size={20} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Nama Kategori <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCategory.name || ""}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        name: e.target.value,
                        slug: slugify(e.target.value),
                      })
                    }
                    placeholder="Contoh: Plumbing"
                    className="w-full p-2.5 rounded-xl border border-neutral-200"
                  />
                </div>

                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Slug Kategori
                  </label>
                  <input
                    type="text"
                    value={editingCategory.slug || ""}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        slug: slugify(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Pilihan Ikon
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: "Drop", label: "Drop (Air)" },
                      { name: "Brush2", label: "Brush (Cat)" },
                      { name: "Ruler", label: "Ruler (Kayu)" },
                      { name: "Wind", label: "Wind (AC)" },
                    ].map((iconOption) => (
                      <button
                        key={iconOption.name}
                        type="button"
                        onClick={() =>
                          setEditingCategory({
                            ...editingCategory,
                            icon: iconOption.name,
                          })
                        }
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                          editingCategory.icon === iconOption.name
                            ? "border-lavender-600 bg-lavender-50 ring-2 ring-lavender-200"
                            : "border-neutral-200 hover:bg-neutral-50"
                        }`}
                      >
                        {renderCategoryIcon(iconOption.name)}
                        <span className="text-[10px] text-neutral-600">{iconOption.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100 cursor-pointer">
                  <span className="font-semibold text-neutral-800">Status Aktif</span>
                  <input
                    type="checkbox"
                    checked={editingCategory.is_active}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        is_active: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-lavender-600 focus:ring-lavender-300"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsCatDrawerOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveCat}
              >
                Simpan Kategori
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER PAKET */}
      {isPkgDrawerOpen && editingPackage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end"
          onClick={() => setIsPkgDrawerOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="text-base font-bold text-neutral-900">
                  {editingPackage.id ? "Edit Paket Layanan" : "Tambah Paket Baru"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPkgDrawerOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <CloseCircle size={20} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Nama Paket <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingPackage.name || ""}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, name: e.target.value })
                    }
                    placeholder="Contoh: Ganti Keran Air"
                    className="w-full p-2.5 rounded-xl border border-neutral-200"
                  />
                </div>

                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Kategori
                  </label>
                  <select
                    value={editingPackage.category_id}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, category_id: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-neutral-700 block mb-1">
                      Harga Tetap (Rp) <span className="text-danger-600">*</span>
                    </label>
                    <input
                      type="number"
                      step={5000}
                      value={editingPackage.price || 0}
                      onChange={(e) =>
                        setEditingPackage({
                          ...editingPackage,
                          price: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2.5 rounded-xl border border-neutral-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-neutral-700 block mb-1">
                      Estimasi Durasi (Menit)
                    </label>
                    <input
                      type="number"
                      step={15}
                      value={editingPackage.est_duration_minutes || 60}
                      onChange={(e) =>
                        setEditingPackage({
                          ...editingPackage,
                          est_duration_minutes: parseInt(e.target.value) || 60,
                        })
                      }
                      className="w-full p-2.5 rounded-xl border border-neutral-200 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Deskripsi Ringkas
                  </label>
                  <textarea
                    rows={2}
                    value={editingPackage.description || ""}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, description: e.target.value })
                    }
                    placeholder="Penjelasan ringkas pekerjaan..."
                    className="w-full p-2.5 rounded-xl border border-neutral-200 resize-none"
                  />
                </div>

                {/* Scope Inclusions */}
                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Cakupan Pekerjaan (Termasuk):
                  </label>
                  <div className="space-y-1 mb-2">
                    {editingPackage.inclusions?.map((inc, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-1.5 px-2 bg-neutral-50 rounded-lg text-[11px]"
                      >
                        <span className="text-neutral-700">✓ {inc}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingPackage({
                              ...editingPackage,
                              inclusions: editingPackage.inclusions?.filter((_, idx) => idx !== i),
                            })
                          }
                          className="text-neutral-400 hover:text-danger-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inclusionsInput}
                      onChange={(e) => setInclusionsInput(e.target.value)}
                      placeholder="Tambah poin cakupan pekerjaan..."
                      className="flex-1 p-2 rounded-xl border border-neutral-200 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (inclusionsInput.trim()) {
                          setEditingPackage({
                            ...editingPackage,
                            inclusions: [...(editingPackage.inclusions || []), inclusionsInput.trim()],
                          });
                          setInclusionsInput("");
                        }
                      }}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-xs font-semibold"
                    >
                      Tambah
                    </button>
                  </div>
                </div>

                {/* Scope Exclusions */}
                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Tidak Termasuk (Pekerjaan Luar Lingkup):
                  </label>
                  <div className="space-y-1 mb-2">
                    {editingPackage.exclusions?.map((exc, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-1.5 px-2 bg-neutral-50 rounded-lg text-[11px]"
                      >
                        <span className="text-neutral-700">✗ {exc}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingPackage({
                              ...editingPackage,
                              exclusions: editingPackage.exclusions?.filter((_, idx) => idx !== i),
                            })
                          }
                          className="text-neutral-400 hover:text-danger-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={exclusionsInput}
                      onChange={(e) => setExclusionsInput(e.target.value)}
                      placeholder="Tambah pengecualian..."
                      className="flex-1 p-2 rounded-xl border border-neutral-200 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (exclusionsInput.trim()) {
                          setEditingPackage({
                            ...editingPackage,
                            exclusions: [...(editingPackage.exclusions || []), exclusionsInput.trim()],
                          });
                          setExclusionsInput("");
                        }
                      }}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-xs font-semibold"
                    >
                      Tambah
                    </button>
                  </div>
                </div>

                <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100 cursor-pointer">
                  <span className="font-semibold text-neutral-800">Status Aktif Paket</span>
                  <input
                    type="checkbox"
                    checked={editingPackage.is_active}
                    onChange={(e) =>
                      setEditingPackage({
                        ...editingPackage,
                        is_active: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-lavender-600 focus:ring-lavender-300"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsPkgDrawerOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSavePkg}
              >
                Simpan Paket
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
