"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MitraShell } from "@/components/mitra/MitraShell";
import {
  Verify,
  Camera,
  Trash,
  GalleryAdd,
  WhatsappIcon,
  Lock,
  LogoutCurve,
  TickCircle,
  ArrowRight2,
  Edit2,
} from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";

export default function MitraProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [worker, setWorker] = useState<any>(null);
  const [userEmail, setUserEmail] = useState("");
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");

  // Editable fields with autosave
  const [bio, setBio] = useState("");
  const [photoPath, setPhotoPath] = useState("");
  const [portfolioPaths, setPortfolioPaths] = useState<string[]>([]);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email) setUserEmail(user.email);

        const res = await fetch("/api/mitra/application");
        if (res.ok) {
          const json = await res.json();
          if (json.application) {
            setWorker(json.application);
            setBio(json.application.bio || "");
            setPhotoPath(json.application.photo_path || "");
            setPortfolioPaths(json.application.portfolio_paths || []);
          }
        }
      } catch (err) {
        console.warn("Failed fetching profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const triggerSave = async (overrides = {}) => {
    try {
      setSaving(true);
      await fetch("/api/mitra/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          photo_path: photoPath,
          portfolio_paths: portfolioPaths,
          ...overrides,
        }),
      });
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPhotoPath(url);
      triggerSave({ photo_path: url });
    };
    reader.readAsDataURL(file);
  };

  const handleAddPortfolio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || portfolioPaths.length >= 3) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      const next = [...portfolioPaths, url];
      setPortfolioPaths(next);
      triggerSave({ portfolio_paths: next });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePortfolio = (index: number) => {
    const next = portfolioPaths.filter((_, i) => i !== index);
    setPortfolioPaths(next);
    triggerSave({ portfolio_paths: next });
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/mitra/login");
      router.refresh();
    } catch {
      router.push("/mitra/login");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setPasswordStatus("Password minimal 8 karakter.");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordStatus(error.message);
      } else {
        setPasswordStatus("Password berhasil diubah!");
        setTimeout(() => {
          setShowPasswordModal(false);
          setNewPassword("");
          setPasswordStatus("");
        }, 1200);
      }
    } catch {
      setPasswordStatus("Gagal mengubah password.");
    }
  };

  const workerSlug =
    worker?.slug ||
    (worker?.full_name ? worker.full_name.toLowerCase().replace(/\s+/g, "-") : "budi-santoso");

  const waChangeTemplate = `Halo Admin BuildMate, saya ${worker?.full_name || "Mitra"} ingin mengajukan perubahan data layanan/area pada profil saya.`;

  return (
    <MitraShell title="Profil Mitra">
      <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-200">
        {/* Autosave Indicator */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-800">
            Profil Publik Saya
          </span>
          {saving ? (
            <span className="text-[11px] text-lavender-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-lavender-600 animate-ping" />
              Menyimpan perubahan...
            </span>
          ) : (
            <span className="text-[11px] text-success-700 bg-success-50 px-2 py-0.5 rounded-full border border-success-200/60 flex items-center gap-1">
              <TickCircle size={12} className="text-success-600" />
              Tersimpan
            </span>
          )}
        </div>

        {/* 1. Customer View Preview Card (W07, C04 style) */}
        <div className="p-4 rounded-3xl bg-neutral-50 border border-neutral-200/80 space-y-3">
          <div className="flex items-start gap-3.5">
            {/* Avatar with Upload Trigger */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-xs bg-neutral-200">
                {photoPath ? (
                  <img
                    src={photoPath}
                    alt={worker?.full_name || "Foto Mitra"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-lg text-neutral-500">
                    {worker?.full_name?.charAt(0) || "M"}
                  </div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-lavender-600 text-white flex items-center justify-center shadow-xs cursor-pointer hover:bg-lavender-700 transition-colors">
                <Camera size={12} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-serif text-lg font-medium text-neutral-900 truncate">
                  {worker?.full_name || "Budi Santoso"}
                </h3>
                {worker?.is_verified && (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-success-700 bg-success-50 px-1.5 py-0.5 rounded-full border border-success-200">
                    <Verify size={11} variant="Bold" className="text-success-600" />
                    Terverifikasi
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                Area {worker?.service_area || "Jakarta Selatan"} · Pengalaman {worker?.experience_years || 5} Thn
              </p>
            </div>
          </div>

          {/* Bio Preview */}
          <p className="text-xs text-neutral-600 leading-relaxed italic bg-white p-3 rounded-xl border border-neutral-100">
            &ldquo;{bio || "Spesialis perbaikan rumah dengan standar artisan rapi dan bergaransi."}&rdquo;
          </p>

          <Link
            href={`/workers/${workerSlug}`}
            className="w-full py-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-xs font-semibold text-lavender-700 flex items-center justify-center gap-1 transition-colors"
          >
            <span>Lihat Tampilan Profil di Sisi Pelanggan</span>
            <ArrowRight2 size={13} />
          </Link>
        </div>

        {/* 2. Editable Bio Field */}
        <div className="space-y-1.5 p-4 rounded-2xl border border-neutral-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-800">
              Deskripsi Singkat (Bio)
            </label>
            <span className="text-[10px] text-neutral-400">
              {bio.length}/300
            </span>
          </div>
          <textarea
            rows={3}
            maxLength={300}
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              triggerSave({ bio: e.target.value });
            }}
            placeholder="Tuliskan keahlian dan komitmen pelayananmu..."
            className="w-full text-xs p-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300 resize-none text-neutral-800"
          />
        </div>

        {/* 3. Editable Portofolio Gallery */}
        <div className="space-y-2 p-4 rounded-2xl border border-neutral-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-800">
              Foto Portofolio ({portfolioPaths.length}/3)
            </label>
            <span className="text-[10px] text-neutral-400">
              Maksimal 3 foto
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
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

        {/* 4. Read-Only Services & Area with Admin WhatsApp Request (A4) */}
        <div className="p-4 rounded-2xl border border-neutral-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-neutral-800">
              Layanan & Area Kerja (Terkunci)
            </h4>
            <span className="text-[10px] text-neutral-400 flex items-center gap-1">
              <Lock size={12} />
              Diverifikasi Admin
            </span>
          </div>

          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Perubahan kategori keahlian, paket layanan, dan area jangkauan diverifikasi langsung oleh tim operator untuk menjaga standar kualitas.
          </p>

          <a
            href={`https://wa.me/6281234567890?text=${encodeURIComponent(waChangeTemplate)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <WhatsappIcon size={16} className="text-success-600" />
            <span>Ajukan Perubahan Layanan ke Admin</span>
          </a>
        </div>

        {/* 5. Account Settings */}
        <div className="p-4 rounded-2xl border border-neutral-200 space-y-3">
          <h4 className="text-xs font-semibold text-neutral-800">
            Pengaturan Akun Mitra
          </h4>

          <div className="text-xs space-y-1 text-neutral-600">
            <p><strong>Email:</strong> {userEmail || "mitra@buildmate.id"}</p>
            <p><strong>Peran Akun:</strong> Mitra Tukang Terverifikasi</p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="flex-1 h-11 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Ubah Password
            </button>

            <button
              type="button"
              onClick={() => setShowLogoutDialog(true)}
              className="h-11 px-4 rounded-xl border border-danger-200 text-xs font-semibold text-danger-700 hover:bg-danger-50 transition-colors flex items-center gap-1.5"
            >
              <LogoutCurve size={15} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-neutral-200 animate-in zoom-in-95">
            <h3 className="font-serif text-xl text-neutral-900">
              Keluar dari Akun Mitra?
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Kamu tidak akan menerima notifikasi tawaran pesanan baru di browser saat sesi keluar.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 h-11 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 h-11 rounded-xl bg-danger-600 hover:bg-danger-700 text-xs font-semibold text-white shadow-xs"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-neutral-200 animate-in zoom-in-95">
            <h3 className="font-serif text-xl text-neutral-900">
              Ubah Password Akun
            </h3>

            {passwordStatus && (
              <p className="text-xs text-lavender-700 bg-lavender-50 p-2.5 rounded-xl border border-lavender-200">
                {passwordStatus}
              </p>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password baru (min. 8 karakter)"
                className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-lavender-300"
              />

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 h-11 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-xs font-semibold text-white shadow-xs"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MitraShell>
  );
}
