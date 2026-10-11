"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  SearchNormal1,
  Location,
  Calendar,
  CloseCircle,
  Clock,
  ArrowRight,
  ShieldTick,
} from "@/lib/icons";
import { DISTRICTS } from "@/lib/constants/areas";

interface AirbnbSearchBarProps {
  className?: string;
  onSearch?: (query: string, district?: string, date?: string) => void;
}

const POPULAR_PROBLEMS = [
  "Cuci & Servis AC",
  "Keran Bocor & Pipa",
  "Korsleting Listrik",
  "Cat Ulang Dinding",
  "Atap Bocor & Waterproofing",
  "Kunci Pintu Macet",
];

export function AirbnbSearchBar({ className = "" }: AirbnbSearchBarProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<"service" | "district" | "date" | null>(null);
  const [serviceQuery, setServiceQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedDate, setSelectedDate] = useState("Kapan Saja");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem("bm_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 4));
      }
    } catch {
      // ignore
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveTab(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExecuteSearch = () => {
    const params = new URLSearchParams();
    if (serviceQuery.trim()) {
      params.set("q", serviceQuery.trim());
      // save to recent
      try {
        const next = [serviceQuery.trim(), ...recentSearches.filter((s) => s !== serviceQuery.trim())].slice(0, 5);
        localStorage.setItem("bm_recent_searches", JSON.stringify(next));
      } catch {
        // ignore
      }
    }
    if (selectedDistrict) {
      params.set("area", selectedDistrict);
    }
    if (selectedDate && selectedDate !== "Kapan Saja") {
      params.set("date", selectedDate);
    }

    setActiveTab(null);
    router.push(`/search?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleExecuteSearch();
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full max-w-4xl mx-auto ${className}`}>
      {/* 1. AIRBNB CAPSULE SEARCH BAR (Desktop) */}
      <div className="hidden md:flex items-center bg-white rounded-full p-2 border border-neutral-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.16)] transition-all">
        {/* Segment 1: Layanan */}
        <div
          onClick={() => setActiveTab("service")}
          className={`flex-1 px-5 py-2.5 rounded-full cursor-pointer transition-colors text-left ${
            activeTab === "service" ? "bg-cream-100/80 shadow-xs" : "hover:bg-neutral-50"
          }`}
        >
          <span className="block text-[11px] font-semibold text-neutral-800 tracking-wide uppercase">
            Layanan
          </span>
          <input
            type="text"
            value={serviceQuery}
            onChange={(e) => setServiceQuery(e.target.value)}
            onFocus={() => setActiveTab("service")}
            onKeyDown={handleKeyDown}
            placeholder="Mau perbaiki apa?"
            className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 font-normal outline-none truncate"
          />
        </div>

        <div className="h-8 w-px bg-neutral-200" />

        {/* Segment 2: Wilayah */}
        <div
          onClick={() => setActiveTab("district")}
          className={`flex-1 px-5 py-2.5 rounded-full cursor-pointer transition-colors text-left ${
            activeTab === "district" ? "bg-cream-100/80 shadow-xs" : "hover:bg-neutral-50"
          }`}
        >
          <span className="block text-[11px] font-semibold text-neutral-800 tracking-wide uppercase">
            Wilayah
          </span>
          <span className="block text-sm text-neutral-900 truncate">
            {selectedDistrict ? selectedDistrict : "Semua Wilayah"}
          </span>
        </div>

        <div className="h-8 w-px bg-neutral-200" />

        {/* Segment 3: Waktu / Jadwal */}
        <div
          onClick={() => setActiveTab("date")}
          className={`flex-1 px-5 py-2.5 rounded-full cursor-pointer transition-colors text-left ${
            activeTab === "date" ? "bg-cream-100/80 shadow-xs" : "hover:bg-neutral-50"
          }`}
        >
          <span className="block text-[11px] font-semibold text-neutral-800 tracking-wide uppercase">
            Waktu
          </span>
          <span className="block text-sm text-neutral-900 truncate">
            {selectedDate}
          </span>
        </div>

        {/* Search Button (Circular Lavender with Magnifying Glass) */}
        <div className="pl-2 pr-1">
          <button
            type="button"
            onClick={handleExecuteSearch}
            className="h-12 w-12 sm:w-auto sm:px-6 rounded-full bg-lavender-600 hover:bg-lavender-700 active:scale-95 text-white flex items-center justify-center gap-2 shadow-sm transition-all"
            aria-label="Cari tukang"
          >
            <SearchNormal1 size={18} variant="Linear" />
            <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">
              Cari
            </span>
          </button>
        </div>
      </div>

      {/* 2. AIRBNB CAPSULE SEARCH BAR (Mobile) */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setActiveTab(activeTab ? null : "service")}
          className="w-full flex items-center justify-between bg-white rounded-full p-3 pl-4 border border-neutral-200 shadow-md text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-lavender-50 text-lavender-600 flex items-center justify-center">
              <SearchNormal1 size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-900">
                {serviceQuery || "Mau benerin apa hari ini?"}
              </p>
              <p className="text-[11px] text-neutral-500">
                {selectedDistrict || "Semua Wilayah"} · {selectedDate}
              </p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-lavender-600 text-white flex items-center justify-center shrink-0">
            <ArrowRight size={16} />
          </div>
        </button>
      </div>

      {/* 3. AIRBNB DROPDOWN POPUP OVERLAYS */}
      {activeTab === "service" && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-white rounded-3xl p-5 border border-neutral-200/90 shadow-xl z-50 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Paling Sering Dicari
            </p>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="text-neutral-400 hover:text-neutral-700"
            >
              <CloseCircle size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            {POPULAR_PROBLEMS.map((prob, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setServiceQuery(prob);
                  setActiveTab("district");
                }}
                className="text-left px-3.5 py-2.5 rounded-xl border border-neutral-200/70 hover:border-lavender-400 hover:bg-lavender-50/50 text-xs text-neutral-800 transition-all font-medium"
              >
                {prob}
              </button>
            ))}
          </div>

          {recentSearches.length > 0 && (
            <div className="mt-4 pt-3 border-t border-neutral-100">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Pencarian Terakhir
              </p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setServiceQuery(term);
                      setActiveTab("district");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream-100 hover:bg-cream-200 text-xs text-neutral-700 transition-colors"
                  >
                    <Clock size={12} className="text-neutral-400" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "district" && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-white rounded-3xl p-5 border border-neutral-200/90 shadow-xl z-50 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Pilih Wilayah Layanan
              </p>
              <p className="text-xs text-neutral-400">
                Pilih wilayah lokasimu untuk melihat tukang terdekat
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="text-neutral-400 hover:text-neutral-700"
            >
              <CloseCircle size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 max-h-60 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => {
                setSelectedDistrict("");
                setActiveTab("date");
              }}
              className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                selectedDistrict === ""
                  ? "border-lavender-600 bg-lavender-50 text-lavender-800"
                  : "border-neutral-200 hover:border-neutral-300 text-neutral-700"
              }`}
            >
              Semua Wilayah
            </button>
            {DISTRICTS.map((dist, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedDistrict(dist.name);
                  setActiveTab("date");
                }}
                className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  selectedDistrict === dist.name
                    ? "border-lavender-600 bg-lavender-50 text-lavender-800"
                    : "border-neutral-200 hover:border-neutral-300 text-neutral-700"
                }`}
              >
                <span>{dist.name}</span>
                <span className="block text-[10px] text-neutral-400">{dist.area}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "date" && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-white rounded-3xl p-5 border border-neutral-200/90 shadow-xl z-50 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Waktu Kebutuhan Tukang
            </p>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="text-neutral-400 hover:text-neutral-700"
            >
              <CloseCircle size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {["Kapan Saja", "Hari Ini (Prioritas)", "Besok Pagi", "Akhir Pekan Ini"].map(
              (opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedDate(opt);
                    setActiveTab(null);
                  }}
                  className={`p-3.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    selectedDate === opt
                      ? "border-lavender-600 bg-lavender-50 text-lavender-800"
                      : "border-neutral-200 hover:border-neutral-300 text-neutral-700"
                  }`}
                >
                  <Calendar size={16} className="text-lavender-600 mb-1" />
                  <span>{opt}</span>
                </button>
              )
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              {serviceQuery || "Semua Layanan"} · {selectedDistrict || "Semua Wilayah"} · {selectedDate}
            </span>
            <button
              type="button"
              onClick={handleExecuteSearch}
              className="px-5 py-2 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold transition-colors"
            >
              Terapkan & Cari
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
