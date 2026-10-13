"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { RequirePermission } from "@/components/admin/PermissionGate";
import { Button } from "@/components/shared/Button";
import { toast } from "sonner";
import {
  TickCircle,
  CloseCircle,
  Refresh,
  Edit2,
  Trash,
  AddCircle,
  GalleryAdd,
  ArrowUp,
  ArrowDown,
  Eye,
  DocumentText,
  Flash,
  Crown1,
} from "@/lib/icons";
import {
  SiteContentState,
  DEFAULT_SITE_CONTENT,
  FaqItem,
} from "@/lib/data/content-types";

export default function AdminContentPage() {
  const [content, setContent] = useState<SiteContentState>(DEFAULT_SITE_CONTENT);
  const [savedContent, setSavedContent] = useState<SiteContentState>(DEFAULT_SITE_CONTENT);
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Saving states per section
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [savingHero, setSavingHero] = useState(false);
  const [savingPlus, setSavingPlus] = useState(false);
  const [savingLegal, setSavingLegal] = useState(false);
  const [uploadingHeroPhoto, setUploadingHeroPhoto] = useState(false);

  // FAQ Modal (Add / Edit)
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqActive, setFaqActive] = useState(true);
  const [submittingFaq, setSubmittingFaq] = useState(false);

  // Legal Tab (Terms vs Privacy)
  const [legalTab, setLegalTab] = useState<"terms" | "privacy">("terms");
  const [legalPreviewMode, setLegalPreviewMode] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contentRes, faqRes] = await Promise.all([
        fetch("/api/admin/content").then((r) => r.json()),
        fetch("/api/admin/faq").then((r) => r.json()),
      ]);

      if (contentRes.success && contentRes.content) {
        setContent(contentRes.content);
        setSavedContent(contentRes.content);
      }
      if (faqRes.success && faqRes.items) {
        setFaqItems(faqRes.items);
      }
    } catch {
      toast.error("Gagal memuat konten CMS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Section dirty trackers
  const isAnnouncementDirty =
    JSON.stringify(content.announcement) !== JSON.stringify(savedContent.announcement);
  const isHeroDirty =
    JSON.stringify(content.hero) !== JSON.stringify(savedContent.hero);
  const isPlusDirty =
    JSON.stringify(content.plus_banner) !== JSON.stringify(savedContent.plus_banner);
  const isLegalDirty =
    JSON.stringify(content.legal) !== JSON.stringify(savedContent.legal);

  // Save Announcement
  const handleSaveAnnouncement = async () => {
    if (content.announcement.text.length > 80) {
      toast.error("Teks pengumuman maksimal 80 karakter.");
      return;
    }

    setSavingAnnouncement(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "announcement",
          value: content.announcement,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengumuman");

      setSavedContent((prev) => ({ ...prev, announcement: content.announcement }));
      toast.success("Bar pengumuman berhasil diperbarui.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan pengumuman");
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // Save Hero
  const handleSaveHero = async () => {
    setSavingHero(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "hero",
          value: content.hero,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan hero");

      setSavedContent((prev) => ({ ...prev, hero: content.hero }));
      toast.success("Hero beranda berhasil diperbarui.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan hero");
    } finally {
      setSavingHero(false);
    }
  };

  // Hero Photo Upload
  const handleUploadHeroPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploadingHeroPhoto(true);
    try {
      const res = await fetch("/api/admin/content/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah foto hero");

      setContent((prev) => ({
        ...prev,
        hero: {
          ...prev.hero,
          photo_url: data.url,
        },
      }));
      toast.success("Foto hero berhasil diunggah.");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah foto hero");
    } finally {
      setUploadingHeroPhoto(false);
    }
  };

  // Save Plus Banner
  const handleSavePlus = async () => {
    setSavingPlus(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "plus_banner",
          value: content.plus_banner,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan banner Plus");

      setSavedContent((prev) => ({ ...prev, plus_banner: content.plus_banner }));
      toast.success("Banner Plus berhasil diperbarui.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan banner Plus");
    } finally {
      setSavingPlus(false);
    }
  };

  // Save Legal
  const handleSaveLegal = async () => {
    setSavingLegal(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "legal",
          value: content.legal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan halaman legal");

      setSavedContent((prev) => ({ ...prev, legal: content.legal }));
      toast.success("Halaman Syarat & Privasi berhasil diperbarui.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan halaman legal");
    } finally {
      setSavingLegal(false);
    }
  };

  // Save FAQ Item (Add or Edit)
  const handleSaveFaqModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      toast.error("Pertanyaan dan jawaban wajib diisi.");
      return;
    }

    setSubmittingFaq(true);
    try {
      const isEditing = Boolean(editingFaq);
      const url = "/api/admin/faq";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingFaq?.id,
          question: faqQuestion.trim(),
          answer: faqAnswer.trim(),
          is_active: faqActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan item FAQ");

      toast.success(data.message || "FAQ berhasil disimpan.");
      setIsFaqModalOpen(false);
      setEditingFaq(null);

      // Refresh FAQ list
      fetch("/api/admin/faq")
        .then((r) => r.json())
        .then((d) => d.items && setFaqItems(d.items));
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan FAQ");
    } finally {
      setSubmittingFaq(false);
    }
  };

  // Delete FAQ
  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Hapus pertanyaan FAQ ini?")) return;
    try {
      const res = await fetch(`/api/admin/faq?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus FAQ");
      toast.success("Item FAQ berhasil dihapus.");
      setFaqItems((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus FAQ");
    }
  };

  // Reorder FAQ (Up / Down)
  const handleMoveFaq = async (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= faqItems.length) return;

    const newItems = [...faqItems];
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;

    setFaqItems(newItems);

    try {
      await fetch("/api/admin/faq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          orderedIds: newItems.map((item) => item.id),
        }),
      });
      toast.success("Urutan FAQ diperbarui.");
    } catch {
      toast.error("Gagal menyinkronkan urutan FAQ");
    }
  };

  return (
    <AdminShell>
      <RequirePermission permission="content.manage">
        <div className="space-y-6">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-serif text-neutral-900 tracking-tight">
                  Konten Situs (CMS)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-lavender-100 text-lavender-700 border border-lavender-200">
                  Izin: content.manage
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Ubah teks, foto hero beranda, banner Plus, FAQ, dan syarat layanan yang tampil di situs pelanggan.
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

              <Link href="/" target="_blank">
                <Button variant="secondary" size="sm" className="gap-1.5">
                  <Eye size={15} />
                  <span>Buka Beranda Publik ↗</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            {/* 1. BAR PENGUMUMAN */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-lavender-50 text-lavender-600 flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  <div>
                    <h2 className="font-bold text-sm text-neutral-900">Bar Pengumuman (Header Banner)</h2>
                    <p className="text-xs text-neutral-400">
                      Teks strip di paling atas halaman beranda
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isAnnouncementDirty && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                      Perubahan belum disimpan
                    </span>
                  )}
                  <Link href="/" target="_blank" className="text-xs text-neutral-500 hover:text-lavender-700 underline">
                    Lihat di situs
                  </Link>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={savingAnnouncement || !isAnnouncementDirty}
                    onClick={handleSaveAnnouncement}
                  >
                    {savingAnnouncement ? "Menyimpan..." : "Simpan Bagian 1"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Active Toggle */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-700 block">Status Tampil</label>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={content.announcement.active}
                      onChange={(e) =>
                        setContent((prev) => ({
                          ...prev,
                          announcement: { ...prev.announcement, active: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded border-neutral-300 text-lavender-600 focus:ring-lavender-400"
                    />
                    <span className="text-xs text-neutral-700">Aktifkan pengumuman di beranda</span>
                  </label>
                </div>

                {/* Text (Max 80) */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-neutral-700 block">
                      Teks Pengumuman (maks. 80 karakter)
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        content.announcement.text.length > 80
                          ? "text-danger-600 font-bold"
                          : "text-neutral-400"
                      }`}
                    >
                      {content.announcement.text.length}/80
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={80}
                    value={content.announcement.text}
                    onChange={(e) =>
                      setContent((prev) => ({
                        ...prev,
                        announcement: { ...prev.announcement, text: e.target.value },
                      }))
                    }
                    placeholder="Contoh: Promo Spesial Hari Ini: Diskon 20%!"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>

                {/* Target Link */}
                <div className="space-y-1.5 md:col-span-3">
                  <label className="font-semibold text-neutral-700 block">Tautan Tujuan</label>
                  <input
                    type="text"
                    value={content.announcement.link}
                    onChange={(e) =>
                      setContent((prev) => ({
                        ...prev,
                        announcement: { ...prev.announcement, link: e.target.value },
                      }))
                    }
                    placeholder="/search atau /plus"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>
              </div>
            </div>

            {/* 2. HERO BERANDA */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-lavender-50 text-lavender-600 flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <div>
                    <h2 className="font-bold text-sm text-neutral-900">Hero Beranda</h2>
                    <p className="text-xs text-neutral-400">
                      Judul serif, subjudul, dan foto ilustrasi utama
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isHeroDirty && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                      Perubahan belum disimpan
                    </span>
                  )}
                  <Link href="/" target="_blank" className="text-xs text-neutral-500 hover:text-lavender-700 underline">
                    Lihat di situs
                  </Link>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={savingHero || !isHeroDirty}
                    onClick={handleSaveHero}
                  >
                    {savingHero ? "Menyimpan..." : "Simpan Bagian 2"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-neutral-700 block">
                      Judul Hero (Boleh gunakan `*kata*` untuk aksen miring)
                    </label>
                    <input
                      type="text"
                      value={content.hero.title}
                      onChange={(e) =>
                        setContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, title: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-neutral-700 block">Subjudul Hero</label>
                    <textarea
                      rows={3}
                      value={content.hero.subtitle}
                      onChange={(e) =>
                        setContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, subtitle: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-neutral-700 block">
                      Teks Alternatif Foto (Alt Text)
                    </label>
                    <input
                      type="text"
                      value={content.hero.photo_alt}
                      onChange={(e) =>
                        setContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, photo_alt: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                    />
                  </div>
                </div>

                {/* Hero Photo Uploader & Preview (16:9 ratio) */}
                <div className="space-y-2">
                  <label className="font-semibold text-neutral-700 block">
                    Foto Hero (Rasio 16:9, otomatis dikompres ke bucket `site-content`)
                  </label>

                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center group">
                    {content.hero.photo_url ? (
                      <img
                        src={content.hero.photo_url}
                        alt={content.hero.photo_alt}
                        className="w-full h-full object-cover transition-opacity duration-300"
                      />
                    ) : (
                      <div className="text-center text-neutral-400 text-xs">
                        Belum ada foto terpasang
                      </div>
                    )}

                    {uploadingHeroPhoto && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white text-xs font-semibold">
                        Mengunggah foto...
                      </div>
                    )}

                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity font-semibold gap-2 text-xs">
                      <GalleryAdd size={18} />
                      <span>Ganti Foto Hero</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleUploadHeroPhoto}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. BANNER PLUS */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <div>
                    <h2 className="font-bold text-sm text-neutral-900">Banner Keanggotaan Plus</h2>
                    <p className="text-xs text-neutral-400">
                      Promosi membership BuildMate Plus di beranda
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isPlusDirty && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                      Perubahan belum disimpan
                    </span>
                  )}
                  <Link href="/plus" target="_blank" className="text-xs text-neutral-500 hover:text-lavender-700 underline">
                    Lihat di situs
                  </Link>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={savingPlus || !isPlusDirty}
                    onClick={handleSavePlus}
                  >
                    {savingPlus ? "Menyimpan..." : "Simpan Bagian 3"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-semibold text-neutral-700 block">Judul Banner Plus</label>
                  <input
                    type="text"
                    value={content.plus_banner.title}
                    onChange={(e) =>
                      setContent((prev) => ({
                        ...prev,
                        plus_banner: { ...prev.plus_banner, title: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-700 block">Poin Manfaat 1</label>
                  <input
                    type="text"
                    value={content.plus_banner.benefit_1}
                    onChange={(e) =>
                      setContent((prev) => ({
                        ...prev,
                        plus_banner: { ...prev.plus_banner, benefit_1: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-700 block">Poin Manfaat 2</label>
                  <input
                    type="text"
                    value={content.plus_banner.benefit_2}
                    onChange={(e) =>
                      setContent((prev) => ({
                        ...prev,
                        plus_banner: { ...prev.plus_banner, benefit_2: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-700 block">Teks Tombol Aksi</label>
                  <input
                    type="text"
                    value={content.plus_banner.button_text}
                    onChange={(e) =>
                      setContent((prev) => ({
                        ...prev,
                        plus_banner: { ...prev.plus_banner, button_text: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>
              </div>
            </div>

            {/* 4. DAFTAR FAQ (TANYA - JAWAB) */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-lavender-50 text-lavender-600 flex items-center justify-center font-bold text-xs">
                    4
                  </span>
                  <div>
                    <h2 className="font-bold text-sm text-neutral-900">FAQ (Pertanyaan Umum)</h2>
                    <p className="text-xs text-neutral-400">
                      Kelola daftar tanya-jawab, urutan tampil, dan status aktif
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href="/#faq" target="_blank" className="text-xs text-neutral-500 hover:text-lavender-700 underline mr-2">
                    Lihat di situs
                  </Link>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEditingFaq(null);
                      setFaqQuestion("");
                      setFaqAnswer("");
                      setFaqActive(true);
                      setIsFaqModalOpen(true);
                    }}
                    className="gap-1.5"
                  >
                    <AddCircle size={15} />
                    <span>Tambah FAQ</span>
                  </Button>
                </div>
              </div>

              {/* FAQ LIST */}
              <div className="space-y-2.5">
                {faqItems.map((faq, index) => (
                  <div
                    key={faq.id}
                    className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50 hover:bg-white hover:border-neutral-300 transition-all flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900">
                          {index + 1}. {faq.question}
                        </span>
                        {!faq.is_active && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-neutral-200 text-neutral-600 font-semibold">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed pl-4">
                        {faq.answer}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveFaq(index, "up")}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                        title="Geser ke atas"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveFaq(index, "down")}
                        disabled={index === faqItems.length - 1}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                        title="Geser ke bawah"
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFaq(faq);
                          setFaqQuestion(faq.question);
                          setFaqAnswer(faq.answer);
                          setFaqActive(faq.is_active);
                          setIsFaqModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-neutral-600 hover:text-lavender-700 hover:bg-neutral-100"
                        title="Edit FAQ"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="p-1.5 rounded-lg text-danger-500 hover:bg-danger-50"
                        title="Hapus FAQ"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. HALAMAN SYARAT LAYANAN & KEBIJAKAN PRIVASI */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-lavender-50 text-lavender-600 flex items-center justify-center font-bold text-xs">
                    5
                  </span>
                  <div>
                    <h2 className="font-bold text-sm text-neutral-900">
                      Syarat Layanan & Kebijakan Privasi
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Editor teks Markdown sederhana dengan tab pratinjau
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isLegalDirty && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                      Perubahan belum disimpan
                    </span>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={savingLegal || !isLegalDirty}
                    onClick={handleSaveLegal}
                  >
                    {savingLegal ? "Menyimpan..." : "Simpan Bagian 5"}
                  </Button>
                </div>
              </div>

              {/* Subtabs & Mode Selector */}
              <div className="flex items-center justify-between gap-3 text-xs border-b border-neutral-100 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLegalTab("terms")}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                      legalTab === "terms"
                        ? "bg-lavender-50 text-lavender-700 border border-lavender-200"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    Syarat & Ketentuan Layanan
                  </button>

                  <button
                    type="button"
                    onClick={() => setLegalTab("privacy")}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                      legalTab === "privacy"
                        ? "bg-lavender-50 text-lavender-700 border border-lavender-200"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    Kebijakan Privasi
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLegalPreviewMode(false)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      !legalPreviewMode
                        ? "bg-white text-neutral-900 shadow-2xs font-semibold"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setLegalPreviewMode(true)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      legalPreviewMode
                        ? "bg-white text-neutral-900 shadow-2xs font-semibold"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    Pratinjau
                  </button>
                </div>
              </div>

              {/* Editor / Preview Content */}
              {legalPreviewMode ? (
                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 min-h-[160px] text-xs text-neutral-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {legalTab === "terms"
                    ? content.legal.terms_markdown
                    : content.legal.privacy_markdown}
                </div>
              ) : (
                <textarea
                  rows={8}
                  value={
                    legalTab === "terms"
                      ? content.legal.terms_markdown
                      : content.legal.privacy_markdown
                  }
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev,
                      legal: {
                        ...prev.legal,
                        [legalTab === "terms" ? "terms_markdown" : "privacy_markdown"]:
                          e.target.value,
                      },
                    }))
                  }
                  placeholder="Tuliskan dokumen dalam format Markdown..."
                  className="w-full p-3.5 text-xs font-mono rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                />
              )}
            </div>
          </div>
        </div>

        {/* FAQ MODAL: TAMBAH / UBAH */}
        {isFaqModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <h3 className="text-base font-bold text-neutral-900">
                  {editingFaq ? "Ubah Pertanyaan FAQ" : "Tambah Pertanyaan FAQ"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFaqModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <CloseCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveFaqModal} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700 block">Pertanyaan</label>
                  <input
                    type="text"
                    required
                    value={faqQuestion}
                    onChange={(e) => setFaqQuestion(e.target.value)}
                    placeholder="Contoh: Bagaimana cara pembayaran?"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700 block">Jawaban Lengkap</label>
                  <textarea
                    rows={4}
                    required
                    value={faqAnswer}
                    onChange={(e) => setFaqAnswer(e.target.value)}
                    placeholder="Tuliskan jawaban yang ramah pelanggan..."
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={faqActive}
                    onChange={(e) => setFaqActive(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-lavender-600 focus:ring-lavender-400"
                  />
                  <span className="text-xs text-neutral-700">Tampilkan item FAQ ini di situs</span>
                </label>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsFaqModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={submittingFaq}
                  >
                    {submittingFaq ? "Menyimpan..." : "Simpan FAQ"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </RequirePermission>
    </AdminShell>
  );
}
