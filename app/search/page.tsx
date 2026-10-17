"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { WorkerCard } from "@/components/customer/WorkerCard";
import { PackageCard } from "@/components/customer/PackageCard";
import { SearchBox } from "@/components/customer/SearchBox";
import {
  Filter,
  Sort,
  SearchStatus,
  CloseCircle,
  TickCircle,
  ArrowRight,
  Refresh,
} from "@/lib/icons";
import { getCategories, getPackages } from "@/lib/data/services";
import { getWorkers } from "@/lib/data/workers";
import { Category, ServicePackage, Worker } from "@/lib/data/types";
import { SERVICE_AREAS } from "@/lib/constants/areas";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "all";
  const initialTab = (searchParams.get("tab") as "workers" | "packages") || "workers";
  const initialArea = searchParams.get("area") || "all";
  const initialSort = searchParams.get("sort") || "relevant";
  const initialVerifiedOnly = searchParams.get("verified") === "true";

  const [query, setQuery] = useState(initialQ);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [activeTab, setActiveTab] = useState<"workers" | "packages">(initialTab);
  const [selectedArea, setSelectedArea] = useState(initialArea);
  const [selectedSort, setSelectedSort] = useState(initialSort);
  const [verifiedOnly, setVerifiedOnly] = useState(initialVerifiedOnly);
  const [maxPrice, setMaxPrice] = useState<number>(400000);

  const [categories, setCategories] = useState<Category[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    Promise.all([
      getCategories(),
      getPackages(),
      getWorkers({ tab: "active" }),
    ]).then(([cats, pkgs, wks]) => {
      setCategories(cats.filter((c) => c.is_active));
      setPackages(pkgs.filter((p) => p.is_active));
      setWorkers(wks);
      setLoading(false);
    });
  }, []);

  // Sync state when URL params change
  useEffect(() => {
    const tabParam = searchParams.get("tab") as "workers" | "packages";
    if (tabParam && (tabParam === "workers" || tabParam === "packages")) {
      setActiveTab(tabParam);
    }
    const catParam = searchParams.get("category");
    if (catParam) {
      setSelectedCategory(catParam);
    }
    const qParam = searchParams.get("q");
    if (qParam !== null) {
      setQuery(qParam);
    }
  }, [searchParams]);

  // Sync state to URL params
  const updateUrlParams = (updates: Record<string, string | boolean>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === "all") {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });
    router.replace(`/search?${params.toString()}`);
  };

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    updateUrlParams({ category: slug });
  };

  const handleTabChange = (tab: "workers" | "packages") => {
    setActiveTab(tab);
    updateUrlParams({ tab });
  };

  const handleSearchSubmit = (newQ: string) => {
    setQuery(newQ);
    updateUrlParams({ q: newQ });
  };

  const handleResetFilters = () => {
    setSelectedCategory("all");
    setSelectedArea("all");
    setSelectedSort("relevant");
    setVerifiedOnly(false);
    setMaxPrice(400000);
    setQuery("");
    router.replace("/search");
    setFilterSheetOpen(false);
  };

  // Filtered workers
  const filteredWorkers = useMemo(() => {
    let result = [...workers];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (w) =>
          w.full_name.toLowerCase().includes(q) ||
          w.bio.toLowerCase().includes(q) ||
          w.service_area.toLowerCase().includes(q)
      );
    }

    if (selectedArea !== "all" && selectedArea !== "Semua Area") {
      result = result.filter((w) => w.service_area.toLowerCase().includes(selectedArea.toLowerCase()));
    }

    if (verifiedOnly) {
      result = result.filter((w) => w.is_verified);
    }

    if (selectedCategory !== "all") {
      const cat = categories.find((c) => c.slug === selectedCategory || c.id === selectedCategory);
      const categoryPackageIds = new Set(
        packages
          .filter(
            (p) =>
              p.category_slug === selectedCategory ||
              p.category_id === selectedCategory ||
              (cat && (p.category_id === cat.id || p.category_name === cat.name))
          )
          .map((p) => p.id)
      );
      result = result.filter((w) => (w.package_ids || []).some((id) => categoryPackageIds.has(id)));
    }

    // Sort
    if (selectedSort === "most_jobs") {
      result.sort((a, b) => (b.completed_jobs_count || 0) - (a.completed_jobs_count || 0));
    } else if (selectedSort === "experience") {
      result.sort((a, b) => b.experience_years - a.experience_years);
    }

    return result;
  }, [workers, packages, categories, query, selectedArea, verifiedOnly, selectedCategory, selectedSort]);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    let result = [...packages];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.category_name && p.category_name.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== "all") {
      // Chips and homepage tiles pass the category slug (C01 → /search?category={slug})
      const cat = categories.find((c) => c.slug === selectedCategory || c.id === selectedCategory);
      result = result.filter(
        (p) =>
          p.category_slug === selectedCategory ||
          p.category_id === selectedCategory ||
          (cat && (p.category_id === cat.id || p.category_name === cat.name))
      );
    }

    if (maxPrice < 400000) {
      result = result.filter((p) => p.price <= maxPrice);
    }

    // Sort
    if (selectedSort === "price_low") {
      result.sort((a, b) => a.price - b.price);
    } else if (selectedSort === "price_high") {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [packages, categories, query, selectedCategory, maxPrice, selectedSort]);

  const currentCount =
    activeTab === "workers" ? filteredWorkers.length : filteredPackages.length;

  return (
    <CustomerShell title="Cari Tukang & Paket">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-[70px] py-6 sm:py-8">
        {/* Sticky Top Search & Category Bar (Mobile & Desktop) */}
        <div className="space-y-4 mb-8">
          <div className="max-w-2xl mx-auto">
            <SearchBox initialValue={query} onSearch={handleSearchSubmit} />
          </div>

          {/* Scrollable Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => handleCategoryChange("all")}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === "all"
                  ? "bg-lavender-600 text-white shadow-xs"
                  : "bg-white border border-neutral-200/90 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              Semua Kategori
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.slug
                    ? "bg-lavender-600 text-white shadow-xs"
                    : "bg-white border border-neutral-200/90 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Segmented Tab (Tukang | Paket) + Filter Button */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60">
            {/* Segmented Switch */}
            <div className="inline-flex p-1 rounded-xl bg-neutral-200/70 border border-neutral-200 text-xs font-semibold">
              <button
                onClick={() => handleTabChange("workers")}
                className={`px-4 py-1.5 rounded-lg transition-all ${
                  activeTab === "workers"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Tukang ({filteredWorkers.length})
              </button>
              <button
                onClick={() => handleTabChange("packages")}
                className={`px-4 py-1.5 rounded-lg transition-all ${
                  activeTab === "packages"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Paket Layanan ({filteredPackages.length})
              </button>
            </div>

            {/* Mobile Filter Sheet Button */}
            <button
              onClick={() => setFilterSheetOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 shadow-xs active:scale-95 transition-transform"
            >
              <Filter size={15} />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Layout: Sidebar (Desktop ≥1024px) + Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Filter Sidebar (280px) */}
          <aside className="hidden lg:block bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-6 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-900 text-sm">Filter Pencarian</h3>
              <button
                onClick={handleResetFilters}
                className="text-xs text-lavender-700 hover:underline font-medium"
              >
                Reset
              </button>
            </div>

            {/* Area Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-700">
                Area Layanan
              </label>
              <select
                value={selectedArea}
                onChange={(e) => {
                  setSelectedArea(e.target.value);
                  updateUrlParams({ area: e.target.value });
                }}
                className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs bg-white text-neutral-900 focus:outline-none focus:border-lavender-600"
              >
                {SERVICE_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-700">
                Urutkan Berdasarkan
              </label>
              <select
                value={selectedSort}
                onChange={(e) => {
                  setSelectedSort(e.target.value);
                  updateUrlParams({ sort: e.target.value });
                }}
                className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs bg-white text-neutral-900 focus:outline-none focus:border-lavender-600"
              >
                <option value="relevant">Paling Relevan</option>
                <option value="price_low">Harga Terendah</option>
                <option value="price_high">Harga Tertinggi</option>
                <option value="most_jobs">Paling Banyak Dikerjakan</option>
                <option value="experience">Pengalaman Terlama</option>
              </select>
            </div>

            {/* Price Slider (for Packages) */}
            {activeTab === "packages" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700">Maks. Harga</span>
                  <span className="font-semibold text-lavender-700">
                    Rp{maxPrice.toLocaleString("id-ID")}
                  </span>
                </div>
                <input
                  type="range"
                  min={100000}
                  max={400000}
                  step={25000}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-lavender-600"
                />
              </div>
            )}

            {/* Verified Switch */}
            <div className="pt-2">
              <label className="flex items-center justify-between cursor-pointer text-xs font-medium text-neutral-700">
                <span>Hanya Tukang Terverifikasi</span>
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => {
                    setVerifiedOnly(e.target.checked);
                    updateUrlParams({ verified: e.target.checked });
                  }}
                  className="rounded border-neutral-300 text-lavender-600 focus:ring-lavender-500 w-4 h-4"
                />
              </label>
            </div>
          </aside>

          {/* Results Grid (3 columns on desktop) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Result Header Count */}
            <div className="text-xs text-neutral-500 font-medium">
              Menampilkan {currentCount}{" "}
              {activeTab === "workers" ? "tukang mitra" : "paket layanan"}
              {query ? ` untuk "${query}"` : ""}
            </div>

            {/* Empty State */}
            {currentCount === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-neutral-200/90 text-center max-w-lg mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-lavender-50 border border-lavender-100 flex items-center justify-center mx-auto text-lavender-600">
                  <SearchStatus size={32} variant="Bulk" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-2xl text-neutral-900">
                    Belum ada hasil ditemukan
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                    Tidak ditemukan {activeTab === "workers" ? "tukang" : "paket"} yang cocok dengan kriteria pencarianmu. Cobalah kata kunci lain atau reset filter.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs"
                >
                  Reset Semua Filter
                </button>
              </div>
            ) : (
              <>
                {/* Workers View */}
                {activeTab === "workers" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredWorkers.slice(0, visibleCount).map((worker) => (
                      <WorkerCard
                        key={worker.id}
                        id={worker.id}
                        slug={worker.slug}
                        fullName={worker.full_name}
                        photoPath={worker.photo_path}
                        serviceArea={worker.service_area}
                        isVerified={worker.is_verified}
                        completedJobsCount={worker.completed_jobs_count}
                        experienceYears={worker.experience_years}
                        categoryName={worker.service_area.includes("Selatan") ? "Plumbing" : "Perbaikan"}
                        startingPrice={150000}
                      />
                    ))}
                  </div>
                )}

                {/* Packages View */}
                {activeTab === "packages" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPackages.slice(0, visibleCount).map((pkg) => (
                      <PackageCard
                        key={pkg.id}
                        id={pkg.id}
                        name={pkg.name}
                        categoryName={pkg.category_name || "Layanan"}
                        categorySlug={pkg.category_slug}
                        imageUrl={pkg.image_url}
                        badge={pkg.badge}
                        description={pkg.description}
                        price={pkg.price}
                        durationMinutes={pkg.est_duration_minutes}
                        inclusions={pkg.inclusions}
                        workerCount={pkg.worker_count || 6}
                      />
                    ))}
                  </div>
                )}

                {/* "Muat Lebih Banyak" Pagination Button */}
                {currentCount > visibleCount && (
                  <div className="text-center pt-6">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 6)}
                      className="px-6 py-3 rounded-full bg-white border border-neutral-200 hover:border-lavender-400 text-xs font-semibold text-neutral-800 shadow-xs hover:shadow-sm active:scale-95 transition-all"
                    >
                      Muat Lebih Banyak
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Bottom Sheet */}
      {filterSheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end animate-in fade-in">
          <div className="bg-white rounded-t-3xl p-6 space-y-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Sheet Handle */}
            <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto -mt-2" />

            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="font-serif text-2xl text-neutral-900">Filter Pencarian</h3>
              <button
                onClick={() => setFilterSheetOpen(false)}
                className="text-neutral-400 p-1"
                aria-label="Tutup"
              >
                <CloseCircle size={20} />
              </button>
            </div>

            {/* Area Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-700">
                Pilih Area Layanan
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-neutral-200 text-xs bg-white text-neutral-900"
              >
                {SERVICE_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-700">
                Urutkan
              </label>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-neutral-200 text-xs bg-white text-neutral-900"
              >
                <option value="relevant">Paling Relevan</option>
                <option value="price_low">Harga Terendah</option>
                <option value="price_high">Harga Tertinggi</option>
                <option value="most_jobs">Paling Banyak Dikerjakan</option>
              </select>
            </div>

            {/* Verified Switch */}
            <div>
              <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-neutral-800">
                <span>Hanya Tukang Terverifikasi</span>
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="rounded border-neutral-300 text-lavender-600 focus:ring-lavender-500 w-5 h-5"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-3 rounded-xl bg-neutral-100 text-neutral-700 text-xs font-semibold"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  updateUrlParams({
                    area: selectedArea,
                    sort: selectedSort,
                    verified: verifiedOnly,
                  });
                  setFilterSheetOpen(false);
                }}
                className="py-3 rounded-xl bg-lavender-600 text-white text-xs font-semibold shadow-xs"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-neutral-400">Memuat pencarian...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
