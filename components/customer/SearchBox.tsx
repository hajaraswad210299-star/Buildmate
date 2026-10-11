"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SearchNormal1, CloseCircle, Clock, ArrowRight } from "@/lib/icons";

interface SearchBoxProps {
  initialValue?: string;
  onSearch?: (query: string) => void;
  className?: string;
  autoFocus?: boolean;
}

const TYPEWRITER_WORDS = [
  "Keran bocor di dapur…",
  "Cat ulang dinding kamar…",
  "Engsel pintu rusak seret…",
  "Saluran air mampet…",
  "Pasang rak dinding gantung…",
  "Servis cuci AC rumah…",
];

export function SearchBox({
  initialValue = "",
  onSearch,
  className = "",
  autoFocus = false,
}: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [placeholder, setPlaceholder] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Typewriter effect
  useEffect(() => {
    if (isFocused || query.length > 0) return;

    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeout: NodeJS.Timeout;

    const tick = () => {
      const currentWord = TYPEWRITER_WORDS[wordIndex];

      if (!isDeleting) {
        setPlaceholder(currentWord.substring(0, charIndex + 1));
        charIndex++;

        if (charIndex === currentWord.length) {
          isDeleting = true;
          timeout = setTimeout(tick, 1500); // pause at end of word
          return;
        }
        timeout = setTimeout(tick, 60);
      } else {
        setPlaceholder(currentWord.substring(0, charIndex - 1));
        charIndex--;

        if (charIndex === 0) {
          isDeleting = false;
          wordIndex = (wordIndex + 1) % TYPEWRITER_WORDS.length;
          timeout = setTimeout(tick, 300);
          return;
        }
        timeout = setTimeout(tick, 30);
      }
    };

    timeout = setTimeout(tick, 300);
    return () => clearTimeout(timeout);
  }, [isFocused, query]);

  // Load recent searches from localStorage
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

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveToRecent = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    try {
      const updated = [trimmed, ...recentSearches.filter((item) => item !== trimmed)].slice(
        0,
        5
      );
      setRecentSearches(updated);
      localStorage.setItem("bm_recent_searches", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleExecuteSearch = (searchWord: string) => {
    const trimmed = searchWord.trim();
    if (!trimmed) return;
    saveToRecent(trimmed);
    setIsFocused(false);
    if (onSearch) {
      onSearch(trimmed);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteSearch(query);
  };

  const handleClear = () => {
    setQuery("");
    if (onSearch) onSearch("");
  };

  const removeRecent = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = recentSearches.filter((i) => i !== itemToRemove);
    setRecentSearches(filtered);
    localStorage.setItem("bm_recent_searches", JSON.stringify(filtered));
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative w-full">
        <div
          className={`relative flex items-center h-14 w-full rounded-2xl bg-white border transition-all duration-200 ${
            isFocused
              ? "border-lavender-600 shadow-md ring-4 ring-lavender-100"
              : "border-neutral-200/90 hover:border-neutral-300 shadow-xs"
          }`}
        >
          <div className="pl-4 pr-2 text-lavender-600 flex items-center pointer-events-none">
            <SearchNormal1 size={22} variant="Linear" />
          </div>

          <input
            type="text"
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder={isFocused ? "Cari jasa atau tukang..." : placeholder}
            className="w-full h-full pr-12 text-sm sm:text-base text-neutral-900 placeholder:text-neutral-400 bg-transparent focus:outline-none"
          />

          {query ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-14 text-neutral-400 hover:text-neutral-700 p-1"
              aria-label="Hapus kata kunci"
            >
              <CloseCircle size={18} />
            </button>
          ) : null}

          <button
            type="submit"
            className="mr-2 h-10 px-4 rounded-xl bg-lavender-600 hover:bg-lavender-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
          >
            <span>Cari</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </form>

      {/* Suggestion Dropdown Panel */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-neutral-200/90 shadow-md p-4 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Quick Categories */}
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Kategori Populer
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { name: "Keran & Saluran", slug: "plumbing" },
                { name: "Pengecatan", slug: "pengecatan" },
                { name: "Pintu & Engsel", slug: "perbaikan-umum" },
                { name: "Servis AC", slug: "servis-ac" },
              ].map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => {
                    setIsFocused(false);
                    router.push(`/search?category=${cat.slug}`);
                  }}
                  className="px-3 py-1.5 rounded-full bg-cream-100 hover:bg-lavender-100 text-xs font-medium text-neutral-700 hover:text-lavender-800 transition-colors"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Pencarian Terakhir
              </p>
              <div className="space-y-1">
                {recentSearches.map((item) => (
                  <div
                    key={item}
                    onClick={() => {
                      setQuery(item);
                      handleExecuteSearch(item);
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-neutral-50 cursor-pointer text-xs text-neutral-700 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock size={15} className="text-neutral-400 group-hover:text-lavender-600" />
                      <span>{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => removeRecent(item, e)}
                      className="text-neutral-400 hover:text-neutral-600 p-1"
                      aria-label="Hapus dari riwayat"
                    >
                      <CloseCircle size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
