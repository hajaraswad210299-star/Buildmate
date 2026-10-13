"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ApplicationStepper } from "@/components/mitra/ApplicationStepper";
import { CategoryPickCard } from "@/components/mitra/CategoryPickCard";
import { AvatarCropper } from "@/components/mitra/AvatarCropper";
import { SERVICE_AREAS } from "@/lib/constants/areas";
import { MOCK_CATEGORIES, MOCK_PACKAGES } from "@/lib/mock/data";
import { formatRupiah } from "@/lib/format";
import {
  TickCircle,
  Warning2,
  GalleryAdd,
  Trash,
  ArrowRight,
  ArrowLeft2,
  Send2,
} from "@/lib/icons";

export default function MitraDaftarPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("saved");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceArea, setServiceArea] = useState("Jakarta Selatan");
  const [experienceYears, setExperienceYears] = useState(3);
  const [bio, setBio] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>(["cat-1"]);
  const [packageIds, setPackageIds] = useState<string[]>(["pkg-1"]);
  const [photoPath, setPhotoPath] = useState("");
  const [portfolioPaths, setPortfolioPaths] = useState<string[]>([]);
  const [agreePublic, setAgreePublic] = useState(false);
  const [agreeCoord, setAgreeCoord] = useState(false);
  const [formError, setFormError] = useState("");

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch existing application draft on load
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("/api/mitra/application");
        if (res.ok) {
          const json = await res.json();
          if (json.application) {
            const app = json.application;
            if (app.full_name) setFullName(app.full_name);
            if (app.phone) setPhone(app.phone);
            if (app.service_area) setServiceArea(app.service_area);
            if (app.experience_years) setExperienceYears(app.experience_years);
            if (app.bio) setBio(app.bio);
            if (app.category_ids?.length) setCategoryIds(app.category_ids);
            if (app.package_ids?.length) setPackageIds(app.package_ids);
            if (app.photo_path) setPhotoPath(app.photo_path);
            if (app.portfolio_paths) setPortfolioPaths(app.portfolio_paths);
            if (app.rejection_reason) setRejectionReason(app.rejection_reason);

            // If already pending or approved, redirect accordingly
            if (app.application_status === "pending") {
              router.push("/mitra/status");
              return;
            }
            if (app.application_status === "approved") {
              router.push("/mitra");
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Failed loading application:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  // Debounced Autosave (1 second debounce)
  const triggerAutosave = useCallback(
    (overrides = {}) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setAutosaveStatus("saving");

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const payload = {
            full_name: fullName,
            phone,
            service_area: serviceArea,
            experience_years: experienceYears,
            bio,
            category_ids: categoryIds,
            package_ids: packageIds,
            photo_path: photoPath,
            portfolio_paths: portfolioPaths,
            agreement_terms: agreePublic,
            agreement_data: agreeCoord,
            ...overrides,
          };

          await fetch("/api/mitra/application", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          setAutosaveStatus("saved");
        } catch {
          setAutosaveStatus("idle");
        }
      }, 1000);
    },
    [
      fullName,
      phone,
      serviceArea,
      experienceYears,
      bio,
      categoryIds,
      packageIds,
      photoPath,
      portfolioPaths,
      agreePublic,
      agreeCoord,
    ]
  );

  // Trigger autosave on field modifications
  const handleFieldChange = (setter: any, val: any, keyName?: string) => {
    setter(val);
    if (keyName) {
      triggerAutosave({ [keyName]: val });
    } else {
      triggerAutosave();
    }
  };

  const toggleCategory = (catId: string) => {
    let nextCats: string[];
    if (categoryIds.includes(catId)) {
      if (categoryIds.length === 1) return; // Keep at least one
      nextCats = categoryIds.filter((c) => c !== catId);
    } else {
      nextCats = [...categoryIds, catId];
    }
    setCategoryIds(nextCats);
    triggerAutosave({ category_ids: nextCats });
  };

  const togglePackage = (pkgId: string) => {
    let nextPkgs: string[];
    if (packageIds.includes(pkgId)) {
      if (packageIds.length === 1) return; // Keep at least one
      nextPkgs = packageIds.filter((p) => p !== pkgId);
    } else {
      nextPkgs = [...packageIds, pkgId];
    }
    setPackageIds(nextPkgs);
    triggerAutosave({ package_ids: nextPkgs });
  };

  const handleAddPortfolio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || portfolioPaths.length >= 3) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      const next = [...portfolioPaths, url];
      setPortfolioPaths(next);
      triggerAutosave({ portfolio_paths: next });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePortfolio = (index: number) => {
    const next = portfolioPaths.filter((_, i) => i !== index);
    setPortfolioPaths(next);
    triggerAutosave({ portfolio_paths: next });
  };

  // Submit Application
  const handleSubmit = async () => {
    if (!agreePublic || !agreeCoord) {
      setFormError("Harap centang persetujuan profil dan penggunaan data.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");

      const res = await fetch("/api/mitra/application/submit", {
        method: "POST",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Gagal mengirim formulir.");
        return;
      }

      router.push("/mitra/status");
    } catch (err: any) {
      setFormError(err?.message || "Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-lavender-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Filter packages for selected categories
  const relevantPackages = MOCK_PACKAGES.filter((p) =>
    categoryIds.includes(p.category_id)
  );

  return (
    <div className="min-h-screen bg-neutral-100/60 flex justify-center text-neutral-900 font-sans">
      <div className="w-full max-w-[480px] bg-white min-h-screen flex flex-col shadow-sm relative">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-neutral-200/80 px-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-medium text-neutral-900">
              Pendaftaran Mitra
            </span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider text-lavender-700 uppercase bg-lavender-50 px-2 py-0.5 rounded-full border border-lavender-200/60">
            Gratis
          </span>
        </header>

        {/* 4-Step Stepper Header */}
        <ApplicationStepper
          currentStep={step}
          onStepClick={(s) => setStep(s)}
          autosaveStatus={autosaveStatus}
        />

        {/* Rejection Notice Banner if previously rejected */}
        {rejectionReason && (
          <div className="mx-4 mt-4 p-4 rounded-2xl bg-danger-50 border border-danger-200 text-xs text-danger-800 space-y-1 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-semibold text-danger-900">
              <Warning2 size={16} className="text-danger-600" />
              <span>Pendaftaran Sebelumnya Belum Disetujui</span>
            </div>
            <p className="text-[11px] text-danger-700 leading-relaxed">
              Catatan Admin: <em>&ldquo;{rejectionReason}&rdquo;</em>
            </p>
            <p className="text-[10px] text-danger-600 pt-0.5">
              Silakan perbaiki data di bawah lalu ajukan ulang pendaftaranmu.
            </p>
          </div>
        )}

        {/* Content Container per Step */}
        <div className="flex-1 p-4 pb-28 space-y-6">
          {formError && (
            <div className="p-3.5 rounded-xl bg-danger-50 border border-danger-200 text-xs text-danger-700 flex items-center gap-2 animate-in fade-in">
              <Warning2 size={16} className="text-danger-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* ================= STEP 1: DATA DIRI ================= */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="font-serif text-2xl text-neutral-900">
                  Data Diri & Pengalaman
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Informasi ini akan dicocokkan dengan pesanan pelanggan di sekitarmu.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => handleFieldChange(setFullName, e.target.value, "full_name")}
                    placeholder="Nama sesuai KTP"
                    className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-lavender-300 focus:border-lavender-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">
                    Nomor WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => handleFieldChange(setPhone, e.target.value, "phone")}
                    placeholder="Contoh: 081234567890"
                    className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-lavender-300 focus:border-lavender-600"
                  />
                  <span className="text-[10px] text-neutral-400">
                    Digunakan untuk koordinasi pekerjaan setelah tawaran kamu terima.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">
                    Area Jangkauan Layanan
                  </label>
                  <select
                    value={serviceArea}
                    onChange={(e) => handleFieldChange(setServiceArea, e.target.value, "service_area")}
                    className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-lavender-300 focus:border-lavender-600"
                  >
                    {SERVICE_AREAS.filter((a) => a !== "Semua Area").map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-xs font-semibold text-neutral-700">
                    Lama Pengalaman Kerja
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={experienceYears <= 1}
                      onClick={() => handleFieldChange(setExperienceYears, Math.max(1, experienceYears - 1), "experience_years")}
                      className="w-11 h-11 rounded-xl border border-neutral-200 text-lg font-bold text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="text-sm font-semibold text-neutral-900 min-w-16 text-center">
                      {experienceYears} Tahun
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFieldChange(setExperienceYears, experienceYears + 1, "experience_years")}
                      className="w-11 h-11 rounded-xl border border-neutral-200 text-lg font-bold text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-neutral-700">
                      Deskripsi Keahlian & Pengalaman
                    </label>
                    <span className="text-[10px] text-neutral-400">
                      {bio.length}/300
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={bio}
                    onChange={(e) => handleFieldChange(setBio, e.target.value, "bio")}
                    placeholder="Ceritakan keahlian utama, peralatan yang kamu miliki, dan pengalaman kerja perbaikan rumah..."
                    className="w-full p-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-lavender-300 focus:border-lavender-600 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: LAYANAN ================= */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="font-serif text-2xl text-neutral-900">
                  Keahlian & Paket Layanan
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Pilih kategori dan paket pekerjaan yang kamu kuasai. (Minimal 1 paket)
                </p>
              </div>

              {/* Category Picker */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-neutral-700">
                  1. Pilih Kategori Keahlian:
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {MOCK_CATEGORIES.map((cat) => (
                    <CategoryPickCard
                      key={cat.id}
                      id={cat.id}
                      name={cat.name}
                      slug={cat.slug}
                      packageCount={cat.package_count || 1}
                      isSelected={categoryIds.includes(cat.id)}
                      onToggle={toggleCategory}
                    />
                  ))}
                </div>
              </div>

              {/* Package Picker for Selected Categories */}
              <div className="space-y-2 pt-4">
                <label className="text-xs font-semibold text-neutral-700">
                  2. Pilih Paket yang Kamu Sanggupi:
                </label>
                <div className="space-y-2">
                  {relevantPackages.map((pkg) => {
                    const checked = packageIds.includes(pkg.id);
                    return (
                      <label
                        key={pkg.id}
                        className={`flex items-start justify-between gap-3 p-3.5 rounded-2xl border cursor-pointer transition-colors ${
                          checked
                            ? "border-lavender-600 bg-lavender-50/50 shadow-xs"
                            : "border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePackage(pkg.id)}
                            className="mt-0.5 accent-lavender-600 w-4 h-4 rounded"
                          />
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-lavender-700">
                              {pkg.category_name}
                            </span>
                            <h4 className="text-xs font-semibold text-neutral-900">
                              {pkg.name}
                            </h4>
                            <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                              {pkg.description}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-neutral-400 block">
                            Kamu dapat
                          </span>
                          <span className="text-xs font-bold text-lavender-800">
                            {formatRupiah(pkg.price)}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: FOTO ================= */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="font-serif text-2xl text-neutral-900">
                  Foto Profil & Portofolio
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Foto wajah jelas membantu pelanggan mempercayai keahlianmu.
                </p>
              </div>

              {/* Photo Cropper Component */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-neutral-700">
                  Foto Profil Wajib <span className="text-danger-600">*</span>
                </label>
                <AvatarCropper
                  photoPath={photoPath}
                  onPhotoSelected={(url) => handleFieldChange(setPhotoPath, url, "photo_path")}
                />
              </div>

              {/* Portfolio Photos */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700">
                    Foto Hasil Kerja Sebelumnya (Opsional, Maks 3)
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    {portfolioPaths.length}/3
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {portfolioPaths.map((pUrl, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200 group shadow-xs"
                    >
                      <img
                        src={pUrl}
                        alt={`Portofolio ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePortfolio(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-danger-600 transition-colors"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  ))}

                  {portfolioPaths.length < 3 && (
                    <label className="aspect-square rounded-xl border border-dashed border-neutral-300 hover:border-lavender-500 bg-neutral-50 hover:bg-lavender-50/50 flex flex-col items-center justify-center text-neutral-400 hover:text-lavender-600 cursor-pointer transition-colors">
                      <GalleryAdd size={22} />
                      <span className="text-[10px] font-medium mt-1">Tambah</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAddPortfolio}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: TINJAU & KIRIM ================= */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="font-serif text-2xl text-neutral-900">
                  Tinjau Data Pendaftaran
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Periksa kembali isian formulir sebelum dikirim ke tim BuildMate.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="space-y-3 pt-2">
                {/* Data Diri Card */}
                <div className="p-4 rounded-2xl border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-neutral-700">
                      Data Diri
                    </h4>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-semibold text-lavender-700 hover:underline"
                    >
                      Ubah
                    </button>
                  </div>
                  <div className="text-xs text-neutral-600 space-y-1">
                    <p><strong>Nama:</strong> {fullName || "Belum diisi"}</p>
                    <p><strong>WhatsApp:</strong> {phone || "Belum diisi"}</p>
                    <p><strong>Area:</strong> {serviceArea}</p>
                    <p><strong>Pengalaman:</strong> {experienceYears} Tahun</p>
                    {bio && <p className="italic text-[11px] text-neutral-500 line-clamp-2">"{bio}"</p>}
                  </div>
                </div>

                {/* Layanan Card */}
                <div className="p-4 rounded-2xl border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-neutral-700">
                      Layanan Terpilih ({packageIds.length} paket)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs font-semibold text-lavender-700 hover:underline"
                    >
                      Ubah
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {MOCK_PACKAGES.filter((p) => packageIds.includes(p.id)).map((p) => (
                      <span
                        key={p.id}
                        className="text-[11px] font-medium bg-lavender-50 text-lavender-800 px-2.5 py-1 rounded-lg border border-lavender-200/60"
                      >
                        {p.name} ({formatRupiah(p.price)})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Foto Card */}
                <div className="p-4 rounded-2xl border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-neutral-700">
                      Foto & Portofolio
                    </h4>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-xs font-semibold text-lavender-700 hover:underline"
                    >
                      Ubah
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    {photoPath ? (
                      <img
                        src={photoPath}
                        alt="Foto Profil"
                        className="w-12 h-12 rounded-full object-cover border border-neutral-200"
                      />
                    ) : (
                      <span className="text-xs text-danger-600 font-medium">Foto profil belum diunggah</span>
                    )}
                    <span className="text-xs text-neutral-500">
                      {portfolioPaths.length} foto portofolio terunggah
                    </span>
                  </div>
                </div>
              </div>

              {/* Checkboxes Persetujuan Wajib (A4) */}
              <div className="space-y-3 pt-3 border-t border-neutral-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreePublic}
                    onChange={(e) => setAgreePublic(e.target.checked)}
                    className="mt-0.5 accent-lavender-600 w-4 h-4 rounded"
                  />
                  <span className="text-[11px] text-neutral-700 leading-relaxed">
                    Saya setuju profil keahlian dan portofolio saya ditampilkan ke calon pelanggan BuildMate setelah disetujui.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeCoord}
                    onChange={(e) => setAgreeCoord(e.target.checked)}
                    className="mt-0.5 accent-lavender-600 w-4 h-4 rounded"
                  />
                  <span className="text-[11px] text-neutral-700 leading-relaxed">
                    Saya mengizinkan nomor WhatsApp saya digunakan untuk konfirmasi dan koordinasi pekerjaan pesanan.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Actions Bar (56px CTA) */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-neutral-200/80 p-4 flex gap-2.5 z-40 shadow-lg">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="h-14 px-4 rounded-2xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowLeft2 size={16} />
              <span>Kembali</span>
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                // Validation per step
                if (step === 1 && (!fullName || !phone)) {
                  setFormError("Nama lengkap dan nomor WhatsApp wajib diisi.");
                  return;
                }
                if (step === 2 && packageIds.length === 0) {
                  setFormError("Pilih minimal 1 paket layanan.");
                  return;
                }
                if (step === 3 && !photoPath) {
                  setFormError("Foto profil wajah wajib diunggah.");
                  return;
                }
                setFormError("");
                setStep(step + 1);
              }}
              className="flex-1 h-14 rounded-2xl bg-lavender-600 hover:bg-lavender-700 active:bg-lavender-800 text-sm font-semibold text-white shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Lanjut ke Langkah {step + 1}</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || !agreePublic || !agreeCoord}
              onClick={handleSubmit}
              className="flex-1 h-14 rounded-2xl bg-lavender-600 hover:bg-lavender-700 active:bg-lavender-800 text-sm font-semibold text-white shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Send2 size={18} />
              <span>{submitting ? "Mengirim Pendaftaran..." : "Kirim Pendaftaran Mitra"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
