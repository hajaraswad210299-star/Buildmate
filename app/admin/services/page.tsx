"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Category, ServicePackage } from "@/lib/data/types";
import { formatRupiah, slugify } from "@/lib/format";
import { Button } from "@/components/shared/Button";
import { toast } from "sonner";
import {
  AddCircle,
  Edit2,
  Trash,
  Drop,
  Brush2,
  Ruler,
  Wind,
  Setting4,
  CloseCircle,
  SearchNormal1,
  Refresh,
  GalleryAdd,
  Eye,
} from "@/lib/icons";
import { FilterDropdown } from "@/components/shared/FilterDropdown";

export default function AdminServicesPage() {
  const [activeTab, setActiveTab] = useState<"packages" | "categories">("packages");
  const [categories, setCategories] = useState<Category[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState("all");

  // Drawer Category
  const [isCatDrawerOpen, setIsCatDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  // Drawer Package
  const [isPkgDrawerOpen, setIsPkgDrawerOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Partial<ServicePackage> | null>(null);
  const [inclusionsInput, setInclusionsInput] = useState("");
  const [exclusionsInput, setExclusionsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image Upload & Delete State
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadFile = async (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Format foto harus JPG, PNG, atau WebP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5 MB");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/services/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal mengunggah foto");
      }

      const data = await res.json();
      if (data.url) {
        setEditingPackage((prev) => (prev ? { ...prev, image_url: data.url } : prev));
        toast.success("Foto paket layanan berhasil diunggah!");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah foto paket");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
    e.target.value = "";
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleRemoveImage = () => {
    setEditingPackage((prev) => (prev ? { ...prev, image_url: "" } : prev));
    toast.success("Foto paket layanan berhasil dihapus");
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/services", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.categories) setCategories(data.categories);
        if (data.packages) setPackages(data.packages);
      } else {
        // Fallback to client lib
        const { getCategories, getPackages } = await import("@/lib/data/services");
        const cats = await getCategories();
        const pkgs = await getPackages();
        setCategories(cats);
        setPackages(pkgs);
      }
    } catch {
      const { getCategories, getPackages } = await import("@/lib/data/services");
      const cats = await getCategories();
      const pkgs = await getPackages();
      setCategories(cats);
      setPackages(pkgs);
    } finally {
      setLoading(false);
    }
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
      category_id: categories[0]?.id || "cat-1",
      category_name: categories[0]?.name || "Plumbing",
      category_slug: categories[0]?.slug || "plumbing",
      price: 120000,
      est_duration_minutes: 60,
      badge: "POPULER",
      image_url:
        "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=80",
      inclusions: ["Pembersihan area", "Pemasangan komponen presisi"],
      exclusions: ["Material sparepart baru disediakan pelanggan"],
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

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "category",
          data: editingCategory,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan kategori");
      }

      toast.success("Kategori layanan berhasil disimpan");
      setIsCatDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePkg = async () => {
    if (!editingPackage?.name?.trim() || !editingPackage?.price) {
      toast.error("Nama paket dan harga wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "package",
          data: editingPackage,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan paket");
      }

      toast.success("Paket layanan berhasil disimpan dan disinkronkan ke web!");
      setIsPkgDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm("Apakah kamu yakin ingin menghapus paket layanan ini?")) return;
    try {
      const res = await fetch(`/api/admin/services?type=package&id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus paket");
      toast.success("Paket layanan berhasil dihapus");
      setIsPkgDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus paket");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Apakah kamu yakin ingin menghapus kategori ini?")) return;
    try {
      const res = await fetch(`/api/admin/services?type=category&id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus kategori");
      toast.success("Kategori berhasil dihapus");
      setIsCatDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus kategori");
    }
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

  const filteredPackages = packages.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      (p.category_name || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q);

    if (!matchSearch) return false;

    if (selectedCatFilter !== "all") {
      return p.category_id === selectedCatFilter || p.category_slug === selectedCatFilter;
    }

    return true;
  });

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
              Atur daftar kategori keahlian, paket harga pasti, durasi, foto, dan cakupan kerja yang tampil di web
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="gap-1.5"
            >
              <Refresh size={14} className={loading ? "animate-spin" : ""} />
              <span>Segarkan</span>
            </Button>
            <button
              type="button"
              onClick={activeTab === "categories" ? handleOpenAddCategory : handleOpenAddPackage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <AddCircle size={16} />
              <span>{activeTab === "categories" ? "Tambah Kategori" : "Tambah Paket"}</span>
            </button>
          </div>
        </div>

        {/* TABS & TOOLBAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 pb-px">
          <div className="flex items-center gap-1">
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
          </div>

          {activeTab === "packages" && (
            <div className="flex items-center gap-2 pb-2 sm:pb-0">
              <div className="relative w-56">
                <SearchNormal1
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari paket layanan..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-neutral-200 text-xs placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                />
              </div>

              <FilterDropdown
                value={selectedCatFilter}
                options={[
                  { value: "all", label: "Semua Kategori" },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                onChange={(val) => setSelectedCatFilter(val)}
                align="right"
                menuWidth="min-w-[180px]"
              />
            </div>
          )}
        </div>

        {/* TAB 1: KATEGORI */}
        {activeTab === "categories" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col justify-between hover:border-lavender-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                      {renderCategoryIcon(cat.icon)}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        cat.is_active
                          ? "bg-success-50 text-success-700"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {cat.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>

                  <h3 className="font-bold text-neutral-900 text-sm mb-1">{cat.name}</h3>
                  <p className="text-[11px] font-mono text-neutral-400">/{cat.slug}</p>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between mt-4">
                  <span className="text-xs text-neutral-500 font-medium">
                    {cat.package_count || 0} paket aktif
                  </span>
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
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: PAKET LAYANAN */}
        {activeTab === "packages" && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                  <th className="py-3 px-4 font-medium">Paket Layanan</th>
                  <th className="py-3 px-3 font-medium">Kategori</th>
                  <th className="py-3 px-3 font-medium text-right">Tarif Tetap</th>
                  <th className="py-3 px-3 font-medium text-center">Durasi</th>
                  <th className="py-3 px-3 font-medium text-center">Badge Web</th>
                  <th className="py-3 px-3 font-medium text-center">Status</th>
                  <th className="py-3 px-4 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredPackages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      Tidak ada paket layanan yang sesuai pencarian / filter.
                    </td>
                  </tr>
                ) : (
                  filteredPackages.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {pkg.image_url ? (
                            <Image
                              src={pkg.image_url}
                              alt={pkg.name}
                              width={40}
                              height={40}
                              unoptimized
                              className="w-10 h-10 rounded-xl object-cover border border-neutral-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-lavender-50 text-lavender-600 flex items-center justify-center font-bold text-xs shrink-0">
                              BM
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-neutral-800 block truncate">
                              {pkg.name}
                            </span>
                            <span className="text-[11px] text-neutral-400 block truncate max-w-xs">
                              {pkg.description}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-neutral-600">
                        {pkg.category_name}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-neutral-900 tabular-nums text-right font-mono">
                        {formatRupiah(pkg.price)}
                      </td>
                      <td className="py-3.5 px-3 text-center text-neutral-600 tabular-nums">
                        {pkg.est_duration_minutes} mnt
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {pkg.badge ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 uppercase tracking-wider">
                            {pkg.badge}
                          </span>
                        ) : (
                          <span className="text-neutral-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
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
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/services/${pkg.id}`}
                            target="_blank"
                            title="Lihat Halaman Pelanggan"
                            className="p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPackage(pkg);
                              setIsPkgDrawerOpen(true);
                            }}
                            className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-semibold transition-colors text-xs"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
                    className="w-full p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-lavender-500"
                  />
                </div>

                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Slug Kategori (URL)
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
                        <span className="text-[10px] text-neutral-600 font-medium">
                          {iconOption.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100 cursor-pointer">
                  <span className="font-semibold text-neutral-800">Status Aktif Kategori</span>
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

            <div className="flex items-center justify-between gap-2.5 pt-4 border-t border-neutral-100">
              {editingCategory.id ? (
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(editingCategory.id!)}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Trash size={14} />
                  <span>Hapus</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
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
                  disabled={isSubmitting}
                  onClick={handleSaveCat}
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Kategori"}
                </Button>
              </div>
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
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-neutral-900">
                    {editingPackage.id ? "Edit Paket Layanan" : "Tambah Paket Baru"}
                  </h3>
                  {editingPackage.id && (
                    <Link
                      href={`/services/${editingPackage.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-lavender-700 bg-lavender-50 hover:bg-lavender-100 border border-lavender-200 transition-colors"
                      title="Lihat tampilan halaman pelanggan"
                    >
                      <Eye size={13} />
                      <span>Lihat di Web</span>
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsPkgDrawerOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <CloseCircle size={20} />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Nama Paket */}
                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Nama Paket Layanan <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingPackage.name || ""}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, name: e.target.value })
                    }
                    placeholder="Contoh: Ganti Keran & Deteksi Pipa"
                    className="w-full p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-lavender-500 font-semibold text-neutral-900"
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Kategori Layanan
                  </label>
                  <FilterDropdown
                    value={editingPackage.category_id || categories[0]?.id || ""}
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                    onChange={(val) => {
                      const selCat = categories.find((c) => c.id === val);
                      setEditingPackage({
                        ...editingPackage,
                        category_id: val,
                        category_name: selCat?.name || "Layanan",
                        category_slug: selCat?.slug || "plumbing",
                      });
                    }}
                    fullWidth
                    size="md"
                    placeholder="Pilih Kategori"
                  />
                </div>

                {/* Harga & Durasi */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-neutral-700 block mb-1">
                      Tarif Paket Pasti (Rp) <span className="text-danger-600">*</span>
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
                      className="w-full p-2.5 rounded-xl border border-neutral-200 font-mono font-bold text-neutral-900 focus:outline-none focus:border-lavender-500"
                    />
                    <span className="text-[11px] text-lavender-700 font-semibold mt-1 block">
                      {formatRupiah(editingPackage.price || 0)}
                    </span>
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
                      className="w-full p-2.5 rounded-xl border border-neutral-200 font-mono focus:outline-none focus:border-lavender-500"
                    />
                  </div>
                </div>

                {/* Badge Promosi */}
                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Badge Web (Label Kartu)
                  </label>
                  <input
                    type="text"
                    value={editingPackage.badge || ""}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, badge: e.target.value })
                    }
                    placeholder="mis. RESPON CEPAT, BERGARANSI"
                    className="w-full p-2.5 rounded-xl border border-neutral-200 uppercase font-semibold text-xs focus:outline-none focus:border-lavender-500"
                  />
                </div>

                {/* Foto Produk Layanan (Upload Sendiri / Input URL & Hapus Foto) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-neutral-700 block text-xs">
                      Foto Paket Layanan
                    </label>
                    <div className="flex items-center gap-1 text-[11px] bg-neutral-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setImageInputMode("upload")}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                          imageInputMode === "upload"
                            ? "bg-white text-lavender-900 shadow-2xs font-semibold"
                            : "text-neutral-500 hover:text-neutral-800"
                        }`}
                      >
                        Unggah Sendiri
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageInputMode("url")}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                          imageInputMode === "url"
                            ? "bg-white text-lavender-900 shadow-2xs font-semibold"
                            : "text-neutral-500 hover:text-neutral-800"
                        }`}
                      >
                        Input URL
                      </button>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />

                  {/* KONDISI 1: JIKA FOTO SUDAH ADA */}
                  {editingPackage.image_url ? (
                    <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/90 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-neutral-200 shrink-0 bg-neutral-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={editingPackage.image_url}
                            alt="Pratinjau Foto"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-neutral-800 block truncate">
                            Foto Paket Terpasang
                          </span>
                          <span className="truncate block font-mono text-[10px] text-neutral-400 max-w-[200px] sm:max-w-xs mt-0.5">
                            {editingPackage.image_url.startsWith("data:")
                              ? "Gambar Unggahan Lokal (Data URL)"
                              : editingPackage.image_url}
                          </span>
                          <span className="inline-block mt-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/40">
                            ✓ Siap Tampil di Web
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-white hover:border-neutral-300 transition-colors flex items-center gap-1"
                          title="Ganti foto dengan file lain"
                        >
                          <Edit2 size={13} />
                          <span>Ganti</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-2.5 py-1.5 rounded-xl border border-danger-200 bg-danger-50 text-xs font-semibold text-danger-700 hover:bg-danger-100 transition-colors flex items-center gap-1"
                          title="Hapus foto dari paket layanan"
                        >
                          <Trash size={13} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* KONDISI 2: BELUM ADA FOTO (MODE UPLOAD ATAU URL) */
                    imageInputMode === "upload" ? (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDropFile}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-5 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          isDragging
                            ? "border-lavender-500 bg-lavender-50/50"
                            : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100/70 hover:border-neutral-300"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-lavender-100 text-lavender-700 flex items-center justify-center">
                          {uploadingImage ? (
                            <div className="w-5 h-5 border-2 border-lavender-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <GalleryAdd size={20} />
                          )}
                        </div>
                        <div className="text-xs">
                          <span className="font-semibold text-lavender-800">
                            {uploadingImage ? "Sedang mengunggah foto..." : "Klik untuk unggah foto"}
                          </span>
                          <span className="text-neutral-500"> atau seret ke sini</span>
                        </div>
                        <span className="text-[10px] text-neutral-400">
                          Mendukung JPG, PNG, atau WebP (maks. 5MB)
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={editingPackage.image_url || ""}
                          onChange={(e) =>
                            setEditingPackage({ ...editingPackage, image_url: e.target.value })
                          }
                          placeholder="https://images.unsplash.com/... atau URL foto lainnya"
                          className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs font-mono focus:outline-none focus:border-lavender-500"
                        />
                        <span className="text-[10px] text-neutral-400 block">
                          Tempel tautan gambar dari web (Unsplash, Supabase, Cloudinary, dll).
                        </span>
                      </div>
                    )
                  )}
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="font-medium text-neutral-700 block mb-1">
                    Deskripsi Ringkas (Tampil di Kartu & Halaman Pesanan)
                  </label>
                  <textarea
                    rows={2}
                    value={editingPackage.description || ""}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, description: e.target.value })
                    }
                    placeholder="Penjelasan ringkas pekerjaan..."
                    className="w-full p-2.5 rounded-xl border border-neutral-200 resize-none focus:outline-none focus:border-lavender-500"
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
                        className="flex items-center justify-between p-1.5 px-2 bg-emerald-50 border border-emerald-100 rounded-lg text-[11px]"
                      >
                        <span className="text-emerald-800 font-medium">✓ {inc}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingPackage({
                              ...editingPackage,
                              inclusions: editingPackage.inclusions?.filter((_, idx) => idx !== i),
                            })
                          }
                          className="text-neutral-400 hover:text-danger-600 font-bold ml-2"
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
                      className="flex-1 p-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-lavender-500"
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
                        className="flex items-center justify-between p-1.5 px-2 bg-neutral-50 border border-neutral-200 rounded-lg text-[11px]"
                      >
                        <span className="text-neutral-600">✗ {exc}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingPackage({
                              ...editingPackage,
                              exclusions: editingPackage.exclusions?.filter((_, idx) => idx !== i),
                            })
                          }
                          className="text-neutral-400 hover:text-danger-600 font-bold ml-2"
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
                      className="flex-1 p-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-lavender-500"
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

                {/* Status Aktif */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100 cursor-pointer">
                  <span className="font-semibold text-neutral-800">Tampilkan di Web Pelanggan (Aktif)</span>
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

            <div className="flex items-center justify-between gap-2.5 pt-4 border-t border-neutral-100">
              {editingPackage.id ? (
                <button
                  type="button"
                  onClick={() => handleDeletePackage(editingPackage.id!)}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Trash size={14} />
                  <span>Hapus Paket</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
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
                  disabled={isSubmitting}
                  onClick={handleSavePkg}
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan & Sinkronkan"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
