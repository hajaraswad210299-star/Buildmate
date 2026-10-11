"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { CustomerShell } from "@/components/customer/CustomerShell";
import {
  Clock,
  Sun1,
  Sun,
  CloudSunny,
  Camera,
  Trash,
  ArrowRight,
  ArrowLeft2,
  ShieldTick,
  Crown1,
  Verify,
  Location,
  TickCircle,
  Warning2,
  InfoCircle,
} from "@/lib/icons";
import { formatRupiah, formatDateId } from "@/lib/format";
import { getPackages } from "@/lib/data/services";
import { getWorkerById } from "@/lib/data/workers";
import { registerClientOrder } from "@/lib/data/orders";
import { ServicePackage, Worker } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ packageId: string }>;
}

function OrderFormContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const workerIdFromQuery = searchParams.get("worker");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pkg, setPkg] = useState<ServicePackage | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);

  // User & Profile
  const [user, setUser] = useState<any>(null);
  const [isPlus, setIsPlus] = useState(false);

  // Form Step 1: Detail
  const [address, setAddress] = useState("");
  const [saveAsDefaultAddress, setSaveAsDefaultAddress] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("Pagi (08.00 - 11.00)");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  // Form Step 2: Confirmation
  const [agreeScope, setAgreeScope] = useState(false);
  const [showPlusUpsellSheet, setShowPlusUpsellSheet] = useState(false);

  // Form Step 3: Payment
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // 14 Days Ahead Options
  const dateOptions = Array.from({ length: 14 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx + 1); // starting tomorrow
    const iso = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
    const dayDate = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    return { iso, dayName, dayDate };
  });

  useEffect(() => {
    // Check auth
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push(
          `/login?next=${encodeURIComponent(
            `/order/${resolvedParams.packageId}${
              workerIdFromQuery ? `?worker=${workerIdFromQuery}` : ""
            }`
          )}`
        );
        return;
      }
      setUser(user);

      // Check profile & phone
      supabase
        .from("profiles")
        .select("default_address, phone, onboarding_completed")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (!profile?.phone || !profile?.onboarding_completed) {
            router.push(
              `/welcome?next=${encodeURIComponent(
                `/order/${resolvedParams.packageId}${
                  workerIdFromQuery ? `?worker=${workerIdFromQuery}` : ""
                }`
              )}`
            );
            return;
          }
          if (profile?.default_address) {
            setAddress(profile.default_address);
          }
        });

      // Check subscription
      supabase
        .from("subscriptions")
        .select("current_period_end")
        .eq("user_id", user.id)
        .single()
        .then(({ data: sub }) => {
          if (sub?.current_period_end && new Date(sub.current_period_end) > new Date()) {
            setIsPlus(true);
          }
        });
    });

    // Load package & worker
    getPackages().then(async (allPkgs) => {
      const foundPkg =
        allPkgs.find((p) => p.id === resolvedParams.packageId) || allPkgs[0];
      setPkg(foundPkg);

      if (workerIdFromQuery) {
        const foundWorker = await getWorkerById(workerIdFromQuery);
        if (foundWorker) setWorker(foundWorker);
      }
      setLoading(false);
    });

    // Default date is tomorrow
    if (dateOptions.length > 0) {
      setSelectedDate(dateOptions[0].iso);
    }

    // Restore from sessionStorage
    try {
      const saved = sessionStorage.getItem("bm_order_draft");
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.address) setAddress(draft.address);
        if (draft.selectedDate) setSelectedDate(draft.selectedDate);
        if (draft.selectedSlot) setSelectedSlot(draft.selectedSlot);
        if (draft.description) setDescription(draft.description);
        if (draft.photos) setPhotos(draft.photos);
      }
    } catch {
      // ignore
    }
  }, [resolvedParams.packageId, workerIdFromQuery]);

  // Save to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "bm_order_draft",
        JSON.stringify({
          address,
          selectedDate,
          selectedSlot,
          description,
          photos,
        })
      );
    } catch {
      // ignore
    }
  }, [address, selectedDate, selectedSlot, description, photos]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 3) {
      toast.error("Maksimal 3 foto masalah.");
      return;
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        if (loadEvt.target?.result) {
          setPhotos((prev) => [...prev, loadEvt.target!.result as string].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep1 = () => {
    if (!address.trim()) {
      toast.error("Mohon isi alamat pengerjaan.");
      return false;
    }
    if (!selectedDate) {
      toast.error("Pilih tanggal pengerjaan.");
      return false;
    }
    if (description.trim().length < 10) {
      toast.error("Deskripsikan masalah minimal 10 karakter.");
      return false;
    }
    return true;
  };

  const handleProceedToStep2 = () => {
    if (validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePayOrder = async () => {
    if (!agreeScope) {
      toast.error("Mohon centang persetujuan cakupan paket terlebih dahulu.");
      return;
    }

    try {
      setSubmitting(true);

      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `idemp-${Date.now()}`;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_id: pkg?.id,
          worker_id: worker?.id || null,
          address,
          scheduled_date: selectedDate,
          time_slot: selectedSlot,
          description,
          photo_paths: photos,
          allow_reassign: true,
          save_default_address: saveAsDefaultAddress,
          idempotency_key: idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Gagal membuat pesanan.");
        setSubmitting(false);
        return;
      }

      setCreatedOrder(data.order);
      setStep(3);

      // Clear draft
      sessionStorage.removeItem("bm_order_draft");

      // Register order locally in browser
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`bm_order_${data.order.id}`, JSON.stringify(data.order));
      }
      registerClientOrder(data.order);

      const snapToken = data.snap_token;

      // Client: muat popup Midtrans Snap Sandbox
      if (typeof window !== "undefined" && (window as any).snap && snapToken) {
        (window as any).snap.pay(snapToken, {
          onSuccess: () => {
            router.push(`/payment/${data.order.id}?status=success`);
          },
          onPending: () => {
            router.push(`/payment/${data.order.id}?status=pending`);
          },
          onError: () => {
            router.push(`/payment/${data.order.id}?status=failed`);
          },
          onClose: () => {
            router.push(`/payment/${data.order.id}`);
          },
        });
      } else {
        // Fallback langsung ke halaman status pembayaran
        router.push(`/payment/${data.order.id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan pembayaran.");
      setSubmitting(false);
    }
  };

  if (loading || !pkg) {
    return (
      <CustomerShell title="Formulir Pesanan">
        <div className="min-h-[50vh] flex items-center justify-center text-xs text-neutral-400">
          Menyiapkan detail pesanan...
        </div>
      </CustomerShell>
    );
  }

  const serviceFee = isPlus ? 0 : 5000;
  const totalCost = pkg.price + serviceFee;

  return (
    <CustomerShell
      title="Pesan Layanan"
      showBack
      backHref={worker ? `/workers/${worker.slug}` : "/search"}
      hideBottomNav={true}
      hideWaButton={true}
    >
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-6 pb-28">
        {/* Stepper 3 Langkah (A5 C05) */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className={step >= 1 ? "text-lavender-700" : "text-neutral-400"}>
              1. Detail Pesanan
            </span>
            <span className={step >= 2 ? "text-lavender-700" : "text-neutral-400"}>
              2. Ringkasan & Biaya
            </span>
            <span className={step >= 3 ? "text-lavender-700" : "text-neutral-400"}>
              3. Pembayaran Rekber
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step >= 1 ? "bg-lavender-600" : "bg-neutral-200"
              }`}
            />
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step >= 2 ? "bg-lavender-600" : "bg-neutral-200"
              }`}
            />
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step >= 3 ? "bg-lavender-600" : "bg-neutral-200"
              }`}
            />
          </div>
        </div>

        {/* STEP 1: DETAIL */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header info */}
            <div className="bg-white p-5 rounded-3xl border border-neutral-200/90 shadow-xs flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Paket Dipilih
                </span>
                <h2 className="font-serif text-2xl text-neutral-900">
                  {pkg.name}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Durasi estimasi: {pkg.est_duration_minutes} menit · {formatRupiah(pkg.price)}
                </p>
              </div>
              {worker && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-neutral-400 block">Mitra Tukang</span>
                  <p className="text-xs font-semibold text-neutral-800">{worker.full_name}</p>
                </div>
              )}
            </div>

            {/* Alamat Pengerjaan */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3">
              <label className="block text-xs font-semibold text-neutral-800">
                Alamat Lengkap Rumah <span className="text-danger-600">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="mis. Jl. Tebet Timur Dalam No. 12, RT 04 / RW 06, Tebet, Jakarta Selatan. (Sertakan patokan/nomor rumah)"
                className="w-full p-3.5 rounded-2xl border border-neutral-200 hover:border-neutral-300 focus:border-lavender-600 focus:ring-4 focus:ring-lavender-100 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all shadow-xs resize-none"
              />
              <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer pt-1 select-none">
                <input
                  type="checkbox"
                  checked={saveAsDefaultAddress}
                  onChange={(e) => setSaveAsDefaultAddress(e.target.checked)}
                  className="rounded border-neutral-300 text-lavender-600 focus:ring-lavender-500 w-4 h-4"
                />
                <span>Simpan sebagai alamat utama profil saya</span>
              </label>
            </div>

            {/* Tanggal Kedatangan (14 Chips Horizontal) */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3">
              <label className="block text-xs font-semibold text-neutral-800">
                Pilih Tanggal Kedatangan <span className="text-danger-600">*</span>
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none">
                {dateOptions.map((opt) => {
                  const isSelected = selectedDate === opt.iso;
                  return (
                    <button
                      key={opt.iso}
                      type="button"
                      onClick={() => setSelectedDate(opt.iso)}
                      className={`px-4 py-2.5 rounded-2xl border text-center shrink-0 transition-all ${
                        isSelected
                          ? "bg-lavender-600 border-lavender-600 text-white shadow-xs"
                          : "bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700"
                      }`}
                    >
                      <span className="block text-[11px] font-medium opacity-80 uppercase tracking-wider">
                        {opt.dayName}
                      </span>
                      <span className="block text-sm font-bold mt-0.5">
                        {opt.dayDate}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slot Waktu (3 Kartu Pagi, Siang, Sore) */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3">
              <label className="block text-xs font-semibold text-neutral-800">
                Pilih Slot Waktu <span className="text-danger-600">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    title: "Pagi",
                    time: "08.00 - 11.00",
                    icon: <Sun1 size={20} />,
                  },
                  {
                    title: "Siang",
                    time: "11.00 - 14.00",
                    icon: <Sun size={20} />,
                  },
                  {
                    title: "Sore",
                    time: "14.00 - 17.00",
                    icon: <CloudSunny size={20} />,
                  },
                ].map((slot) => {
                  const fullLabel = `${slot.title} (${slot.time})`;
                  const isSelected = selectedSlot === fullLabel;
                  return (
                    <button
                      key={slot.title}
                      type="button"
                      onClick={() => setSelectedSlot(fullLabel)}
                      className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                        isSelected
                          ? "border-lavender-600 bg-lavender-50/60 ring-2 ring-lavender-100"
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-lavender-600 text-white" : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {slot.icon}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-900 block">
                          {slot.title}
                        </span>
                        <span className="text-[11px] text-neutral-500 mt-0.5 block">
                          {slot.time}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deskripsi Masalah */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
                <label>
                  Deskripsi Masalah <span className="text-danger-600">*</span>
                </label>
                <span className="text-[11px] text-neutral-400 font-normal">
                  {description.length} / min. 10 karakter
                </span>
              </div>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="mis. Keran wastafel airnya terus menetes meskipun sudah diputar kencang..."
                className="w-full p-3.5 rounded-2xl border border-neutral-200 hover:border-neutral-300 focus:border-lavender-600 focus:ring-4 focus:ring-lavender-100 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all shadow-xs resize-none"
              />
            </div>

            {/* Foto Masalah (0-3 Foto) */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-semibold text-neutral-800">
                    Foto Masalah (Opsional)
                  </label>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Maksimal 3 foto untuk mempermudah tukang menyiapkan alat yang tepat.
                  </p>
                </div>
                <span className="text-xs text-neutral-500 font-medium">
                  {photos.length} / 3
                </span>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                {photos.map((src, i) => (
                  <div
                    key={i}
                    className="relative w-20 h-20 rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 group"
                  >
                    <img src={src} alt="Masalah" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Hapus foto"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}

                {photos.length < 3 && (
                  <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-neutral-300 hover:border-lavender-600 flex flex-col items-center justify-center gap-1 cursor-pointer bg-neutral-50/50 hover:bg-lavender-50/30 transition-all text-neutral-400 hover:text-lavender-700">
                    <Camera size={20} />
                    <span className="text-[10px] font-semibold">+ Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Button Lanjut ke Langkah 2 */}
            <button
              type="button"
              onClick={handleProceedToStep2}
              className="w-full h-12 rounded-full bg-lavender-600 hover:bg-lavender-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all mt-4"
            >
              <span>Lanjut ke Ringkasan Biaya</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* STEP 2: RINGKASAN */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Summary Card */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="font-serif text-2xl text-neutral-900">
                  Ringkasan Pesanan
                </h3>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-lavender-700 hover:underline"
                >
                  Ubah
                </button>
              </div>

              {/* Items */}
              <div className="space-y-3 text-xs">
                <div className="flex items-start justify-between">
                  <span className="text-neutral-500">Layanan & Paket:</span>
                  <span className="font-semibold text-neutral-900 text-right">
                    {pkg.name} ({pkg.category_name})
                  </span>
                </div>
                {worker && (
                  <div className="flex items-start justify-between">
                    <span className="text-neutral-500">Tukang Ditugaskan:</span>
                    <span className="font-semibold text-neutral-900 text-right">
                      {worker.full_name}
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <span className="text-neutral-500">Jadwal Kedatangan:</span>
                  <span className="font-semibold text-neutral-900 text-right">
                    {formatDateId(selectedDate)}, {selectedSlot}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-neutral-500">Alamat:</span>
                  <span className="font-medium text-neutral-800 text-right max-w-xs line-clamp-2">
                    {address}
                  </span>
                </div>
              </div>
            </div>

            {/* Rincian Biaya dengan Garis Titik-titik (Flamingo pattern A2) */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3">
              <h4 className="font-serif text-xl text-neutral-900 mb-2">
                Rincian Biaya
              </h4>

              <div className="space-y-2.5 text-xs text-neutral-700">
                <div className="flex items-center justify-between">
                  <span>Harga Paket Layanan</span>
                  <div className="flex-1 border-b border-dotted border-neutral-300 mx-3" />
                  <span className="font-semibold">{formatRupiah(pkg.price)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Biaya Layanan Platform</span>
                  <div className="flex-1 border-b border-dotted border-neutral-300 mx-3" />
                  <span className="font-semibold">
                    {isPlus ? (
                      <span className="text-emerald-700 font-bold">Rp0 · Plus</span>
                    ) : (
                      formatRupiah(serviceFee)
                    )}
                  </span>
                </div>

                <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-between text-sm">
                  <span className="font-bold text-neutral-900">Total Pembayaran</span>
                  <div className="flex-1 border-b border-dotted border-neutral-300 mx-3" />
                  <span className="font-bold text-lg text-neutral-900 font-sans">
                    {formatRupiah(totalCost)}
                  </span>
                </div>
              </div>
            </div>

            {/* Plus Upsell Card for Free Users */}
            {!isPlus && (
              <div className="p-4 rounded-2xl bg-lavender-50 border border-lavender-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Crown1 size={22} variant="Bold" className="text-lavender-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-neutral-900">
                      Hemat Rp5.000 dengan BuildMate Plus
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Bebas biaya layanan platform dan dapatkan garansi pengerjaan ulang.
                    </p>
                  </div>
                </div>
                <Link
                  href="/plus"
                  className="px-3 py-1.5 rounded-full bg-lavender-600 text-white text-[11px] font-semibold shrink-0"
                >
                  Pelajari
                </Link>
              </div>
            )}

            {/* Mandatory Checkbox Cakupan Paket */}
            <div className="p-4 rounded-2xl bg-cream-100 border border-cream-200/80">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-neutral-800 select-none">
                <input
                  type="checkbox"
                  required
                  checked={agreeScope}
                  onChange={(e) => setAgreeScope(e.target.checked)}
                  className="mt-0.5 rounded border-neutral-300 text-lavender-600 focus:ring-lavender-500 w-4 h-4"
                />
                <span className="leading-relaxed">
                  Saya memahami cakupan paket ini. Pekerjaan dan material tambahan di luar cakupan dibicarakan serta disepakati secara terpisah.
                </span>
              </label>
            </div>

            {/* Buttons Navigation */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 h-12 rounded-full border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-all"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handlePayOrder}
                disabled={!agreeScope || submitting}
                className="w-2/3 h-12 rounded-full bg-lavender-600 hover:bg-lavender-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <span>Menyiapkan pembayaran…</span>
                ) : (
                  <>
                    <span>Bayar {formatRupiah(totalCost)}</span>
                    <ShieldTick size={16} />
                  </>
                )}
              </button>
            </div>

            {/* KOTAK PANDUAN SANDBOX (B12, B20 & Petunjuk Pengujian) */}
            {process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION !== "true" && (
              <div className="mt-4 p-4 rounded-2xl bg-lavender-50/80 border border-lavender-200/90 text-xs text-lavender-950 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-lavender-800">
                  <InfoCircle size={15} className="text-lavender-600 shrink-0" />
                  <span>Mode sandbox — tidak ada uang sungguhan.</span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Pilih metode bayar di popup resmi Midtrans Snap. Untuk pembayaran Virtual Account, QRIS, atau e-wallet, buka{" "}
                  <a
                    href="https://simulator.sandbox.midtrans.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lavender-700 font-bold underline hover:text-lavender-900 inline-flex items-center gap-0.5"
                  >
                    Buka simulator pembayaran
                  </a>
                  . Untuk kartu kredit uji:{" "}
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-lavender-200 font-semibold text-neutral-800">
                    4811 1111 1111 1114
                  </span>
                  , CVV{" "}
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-lavender-200 font-semibold text-neutral-800">
                    123
                  </span>
                  , OTP{" "}
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-lavender-200 font-semibold text-neutral-800">
                    112233
                  </span>
                  . Kotak ini hanya petunjuk pengujian.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: MEMBUKA MIDTRANS SNAP */}
        {step === 3 && (
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-neutral-200/90 text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-lavender-50 border border-lavender-200 flex items-center justify-center mx-auto text-lavender-600">
              <svg
                className="animate-spin h-8 w-8 text-lavender-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-3xl text-neutral-900">
                Membuka Pembayaran Midtrans Snap...
              </h2>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                Popup pembayaran aman Midtrans Snap sedang dibuka. Jika popup tidak terbuka otomatis, klik tombol di bawah untuk memeriksa status pembayaran.
              </p>
            </div>

            {createdOrder && (
              <div className="pt-2">
                <Link
                  href={`/payment/${createdOrder.id}`}
                  className="inline-block px-6 py-3 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Buka Halaman Status Pembayaran
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Script Snap Midtrans Sandbox */}
        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="afterInteractive"
        />
      </div>
    </CustomerShell>
  );
}

export default function OrderFormPage(props: PageProps) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-cream-50 flex items-center justify-center text-xs text-neutral-400">
          Memuat formulir pesanan...
        </div>
      }
    >
      <OrderFormContent {...props} />
    </React.Suspense>
  );
}
