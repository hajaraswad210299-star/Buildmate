"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/shared/Button";
import {
  Lock,
  Eye,
  EyeSlash,
  TickCircle,
  Camera,
  Trash,
  Sms,
  ProfileCircle,
  Setting2,
  Clock,
  Warning2,
} from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function AdminSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"profile" | "system">(
    tabParam === "system" ? "system" : "profile"
  );

  // Profile data
  const [userId, setUserId] = useState<string>("");
  const [fullName, setFullName] = useState<string>("Super Admin");
  const [email, setEmail] = useState<string>("hajaraswad210299@gmail.com");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete avatar dialog
  const [showDeleteAvatarDialog, setShowDeleteAvatarDialog] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);

  // Email change dialog
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailCountdown, setEmailCountdown] = useState(60);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  // Password change dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    if (tabParam === "system") {
      setActiveTab("system");
    } else if (tabParam === "profile") {
      setActiveTab("profile");
    }
  }, [tabParam]);

  const switchTab = (tab: "profile" | "system") => {
    setActiveTab(tab);
    router.replace(`/admin/settings?tab=${tab}`);
  };

  // Load current admin from Supabase
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setEmail(user.email || "hajaraswad210299@gmail.com");
        supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setFullName(profile.full_name || user.user_metadata?.full_name || "Super Admin");
              setAvatarUrl(profile.avatar_url || null);
            } else {
              setFullName(user.user_metadata?.full_name || "Super Admin");
            }
          });
      }
    });
  }, []);

  // Email countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (pendingEmail && emailCountdown > 0) {
      timer = setInterval(() => setEmailCountdown((c) => c - 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [pendingEmail, emailCountdown]);

  // Handle avatar upload with client-side crop to square WebP <= 2MB
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file foto maksimal 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // 1. Process image on canvas (crop centered square & convert to WebP)
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Gagal membaca file gambar."));
      });

      const canvas = document.createElement("canvas");
      const targetSize = 300;
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Gagal memproses gambar.");

      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Gagal konversi ke WebP"));
          },
          "image/webp",
          0.9
        );
      });

      // 2. Upload to Supabase Storage bucket 'avatars'
      const supabase = createClient();
      const currentId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!currentId) throw new Error("Sesi pengguna tidak ditemukan");

      // Per storage RLS policy: (storage.foldername(name))[1] = auth.uid()::text
      const filePath = `${currentId}/avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, {
          upsert: true,
          contentType: "image/webp",
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const versionedUrl = `${publicUrl}?v=${Date.now()}`;
      setAvatarUrl(versionedUrl);

      const { data: updatedProf, error: profileError } = await supabase
        .from("profiles")
        .update({
          avatar_url: versionedUrl,
        })
        .eq("id", currentId)
        .select();

      if (profileError || !updatedProf || updatedProf.length === 0) {
        await supabase.from("profiles").upsert(
          {
            id: currentId,
            avatar_url: versionedUrl,
            full_name: fullName.trim() || "Super Admin",
            role: "admin",
            onboarding_completed: true,
          },
          { onConflict: "id" }
        );
      }

      await supabase.auth.updateUser({
        data: { avatar_url: versionedUrl },
      });

      window.dispatchEvent(
        new CustomEvent("admin_profile_updated", {
          detail: { avatarUrl: versionedUrl, fullName: fullName.trim() },
        })
      );
      toast.success("Foto profil berhasil diunggah dan disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah foto profil.");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle delete avatar
  const handleDeleteAvatar = async () => {
    setIsDeletingAvatar(true);
    try {
      const supabase = createClient();
      const currentId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (currentId) {
        try {
          await supabase.storage.from("avatars").remove([`${currentId}/avatar.webp`]);
        } catch {
          // ignore
        }

        await supabase
          .from("profiles")
          .update({ avatar_url: null })
          .eq("id", currentId);

        await supabase.auth.updateUser({
          data: { avatar_url: null },
        });

        window.dispatchEvent(
          new CustomEvent("admin_profile_updated", {
            detail: { avatarUrl: null },
          })
        );
      }
      setAvatarUrl(null);
      toast.success("Foto profil berhasil dihapus.");
      setShowDeleteAvatarDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus foto profil.");
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  // Handle save full name
  const handleSaveFullName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Nama lengkap tidak boleh kosong.");
      return;
    }

    setIsSavingName(true);
    try {
      const supabase = createClient();
      const currentId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (currentId) {
        const { data: updatedProf, error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim(),
          })
          .eq("id", currentId)
          .select();

        if (profileError || !updatedProf || updatedProf.length === 0) {
          await supabase.from("profiles").upsert(
            {
              id: currentId,
              full_name: fullName.trim(),
              avatar_url: avatarUrl || null,
              role: "admin",
              onboarding_completed: true,
            },
            { onConflict: "id" }
          );
        }
      }

      await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      window.dispatchEvent(
        new CustomEvent("admin_profile_updated", {
          detail: { fullName: fullName.trim() },
        })
      );
      toast.success("Nama lengkap berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui nama.");
    } finally {
      setIsSavingName(false);
    }
  };

  // Handle submit change email
  const handleSubmitChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail.trim().toLowerCase() === email.toLowerCase()) {
      toast.error("Masukkan alamat email baru yang berbeda.");
      return;
    }

    setIsSubmittingEmail(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (error) {
        toast.error(error.message);
      } else {
        setPendingEmail(newEmail.trim());
        setEmailCountdown(60);
        setShowEmailDialog(false);
        toast.success(`Tautan konfirmasi dikirim ke ${newEmail.trim()}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim permintaan ubah email.");
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  // Password strength checklist rules
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const isDifferentFromCurrent = !currentPassword || newPassword !== currentPassword;
  const isMatch = Boolean(newPassword && newPassword === confirmPassword);

  const isPasswordValid =
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial &&
    isDifferentFromCurrent &&
    isMatch;

  // Handle forgot current password link inside modal
  const handleForgotCurrentPassword = async () => {
    setIsSendingResetEmail(true);
    try {
      const supabase = createClient();
      const siteUrl = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=/admin/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`Tautan reset password telah dikirim ke ${email}.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim email reset.");
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // Handle submit change password
  const handleSubmitChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Masukkan password saat ini.");
      return;
    }
    if (!isPasswordValid) {
      toast.error("Pastikan semua kriteria password baru terpenuhi.");
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const supabase = createClient();

      // 1. Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (verifyError) {
        toast.error("Password saat ini salah. Silakan coba lagi.");
        setIsSubmittingPassword(false);
        return;
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error(updateError.message);
        setIsSubmittingPassword(false);
        return;
      }

      // 3. Sign out other sessions
      try {
        await supabase.auth.signOut({ scope: "others" });
      } catch {
        // ignore if not supported
      }

      toast.success(
        "Password berhasil diubah. Sesi di perangkat lain telah dikeluarkan."
      );
      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah password.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // System Configuration definitions (B6 & B19)
  const configs = [
    {
      group: "Biaya & Model Bisnis",
      items: [
        { label: "Biaya Layanan (Pelanggan Gratis)", value: formatRupiah(5000), note: "Snapshot per pesanan" },
        { label: "Biaya Layanan (Member Plus)", value: "Rp0 (Gratis)", note: "Benefit keanggotaan Plus" },
        { label: "Harga Langganan Plus", value: formatRupiah(29000), note: "Sekali bayar per 30 hari" },
        { label: "Durasi Aktif Plus", value: "30 Hari", note: "Bukan recurring otomatis" },
      ],
    },
    {
      group: "Batas Waktu Operasional (SLA)",
      items: [
        { label: "Batas Konfirmasi Pelanggan", value: "24 Jam (Demo: 2 Menit)", note: "Admin dapat selesaikan setelah batas lewat" },
        { label: "Batas Respon Tawaran Tukang", value: "2 Jam (Demo: 1 Menit)", note: "Masuk antrean darurat bila lewat batas" },
        { label: "Garansi Komplain Plus", value: "7 Hari", note: "Pengerjaan ulang gratis" },
      ],
    },
    {
      group: "Integrasi & Lingkungan Sistem",
      items: [
        { label: "Mode Payment Gateway", value: "Midtrans Snap SANDBOX", note: "Simulasi pembayaran tanpa uang sungguhan" },
        { label: "Nomor WhatsApp CS Admin", value: "+62 812-3456-7890", note: "Digunakan untuk template click-to-chat" },
        { label: "Database Online", value: "Supabase PostgreSQL (Singapore)", note: "RLS aktif & Auth terpadu" },
        { label: "Mode Sumber Data", value: "Mock (USE_MOCK_DATA=true)", note: "Fase 1: UI-first prototype" },
      ],
    },
  ];

  return (
    <AdminShell>
      <div className="space-y-6 max-w-5xl">
        {/* HEADER & TABS */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
              Pengaturan Admin
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Kelola informasi profil akun operasional dan parameter konfigurasi sistem
            </p>
          </div>

          {/* TWO TABS: Profil saya & Konfigurasi sistem */}
          <div className="flex items-center gap-2 border-b border-neutral-200">
            <button
              type="button"
              onClick={() => switchTab("profile")}
              className={`pb-3 px-1 text-sm font-semibold transition-colors relative ${
                activeTab === "profile"
                  ? "text-lavender-700"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <ProfileCircle size={16} />
                <span>Profil Saya</span>
              </div>
              {activeTab === "profile" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-lavender-600 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => switchTab("system")}
              className={`pb-3 px-1 text-sm font-semibold transition-colors relative ${
                activeTab === "system"
                  ? "text-lavender-700"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Setting2 size={16} />
                <span>Konfigurasi Sistem</span>
              </div>
              {activeTab === "system" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-lavender-600 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: PROFIL SAYA */}
        {/* ============================================================== */}
        {activeTab === "profile" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Email change status banner if pending */}
            {pendingEmail && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900 block">
                      Permintaan Perubahan Email Menunggu Verifikasi
                    </span>
                    <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                      Tautan konfirmasi dikirim ke <strong>{pendingEmail}</strong>. Email aktif kamu tetap{" "}
                      <strong>{email}</strong> sampai tautan konfirmasi diklik.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPendingEmail(null)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:underline"
                  >
                    Batalkan
                  </button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={emailCountdown > 0}
                    onClick={() => {
                      setEmailCountdown(60);
                      toast.success(`Tautan konfirmasi dikirim ulang ke ${pendingEmail}`);
                    }}
                  >
                    {emailCountdown > 0 ? `Kirim ulang (${emailCountdown}s)` : "Kirim ulang"}
                  </Button>
                </div>
              </div>
            )}

            {/* 1. KARTU FOTO PROFIL */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
              <div className="border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-bold text-neutral-900">Foto Profil Admin</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Foto bundar 80px ditampilkan pada header sidebar dan audit log operasional
                </p>
              </div>

              <div className="flex items-center gap-5">
                {/* Avatar Bundar 80px */}
                <div className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 ring-2 ring-neutral-200 bg-neutral-100 shadow-xs">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-lavender-100 text-lavender-800 flex items-center justify-center font-bold text-xl">
                      {fullName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center text-white text-[10px] font-semibold">
                      Memproses...
                    </div>
                  )}
                </div>

                {/* Upload & Delete Controls */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      leftIcon={<Camera size={14} />}
                    >
                      Ganti foto
                    </Button>

                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowDeleteAvatarDialog(true)}
                        className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 border-neutral-200"
                        leftIcon={<Trash size={14} />}
                      >
                        Hapus foto
                      </Button>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400 block">
                    Format WebP, JPG, atau PNG. Maksimal 2MB (otomatis di-crop bundar).
                  </span>
                </div>
              </div>
            </div>

            {/* 2. KARTU INFORMASI AKUN & NAMA LENGKAP */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
              <div className="border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-bold text-neutral-900">Informasi Pribadi</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Nama lengkap dan alamat email yang digunakan untuk masuk ke sistem
                </p>
              </div>

              <form onSubmit={handleSaveFullName} className="space-y-4 max-w-lg">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama Admin..."
                    className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSavingName}
                >
                  Simpan Nama
                </Button>
              </form>
            </div>

            {/* 3. KARTU KEAMANAN (EMAIL & PASSWORD) */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
              <div className="border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-bold text-neutral-900">Keamanan & Kredensial</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Kelola email terdaftar dan kata sandi akun operasional admin kamu
                </p>
              </div>

              <div className="divide-y divide-neutral-100">
                {/* Row Email */}
                <div className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-neutral-800 block">
                      Alamat Email
                    </span>
                    <span className="text-xs font-mono text-neutral-500 mt-0.5 block">
                      {email}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setNewEmail("");
                      setShowEmailDialog(true);
                    }}
                  >
                    Ubah Email
                  </Button>
                </div>

                {/* Row Password */}
                <div className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-neutral-800 block">
                      Kata Sandi
                    </span>
                    <span className="text-xs text-neutral-400 mt-0.5 block">
                      Terakhir diperbarui secara aman via Supabase Auth
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setShowPasswordDialog(true);
                    }}
                  >
                    Ubah Password
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: KONFIGURASI SISTEM (READ-ONLY) */}
        {/* ============================================================== */}
        {activeTab === "system" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {configs.map((grp) => (
              <div
                key={grp.group}
                className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs"
              >
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">
                  {grp.group}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {grp.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-100 flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-xs text-neutral-500 font-medium block">
                          {item.label}
                        </span>
                        <span className="text-sm font-bold text-neutral-900 mt-1 block font-mono">
                          {item.value}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400 mt-2 block">
                        {item.note}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DIALOG 1: HAPUS FOTO PROFIL */}
      {/* ============================================================== */}
      {showDeleteAvatarDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowDeleteAvatarDialog(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">Hapus Foto Profil?</h3>
              <p className="text-xs text-neutral-500">
                Foto profil kamu akan dihapus dari penyimpanan Supabase dan kembali ke inisial nama.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteAvatarDialog(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                isLoading={isDeletingAvatar}
                onClick={handleDeleteAvatar}
              >
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DIALOG 2: UBAH EMAIL ADMIN */}
      {/* ============================================================== */}
      {showEmailDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowEmailDialog(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-neutral-900">Ubah Alamat Email</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Masukkan email baru. Tautan verifikasi akan dikirimkan ke email baru sebelum perubahan berlaku.
              </p>
            </div>

            <form onSubmit={handleSubmitChangeEmail} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Email Baru
                </label>
                <div className="relative">
                  <Sms
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nama@buildmate.id"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowEmailDialog(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!newEmail.trim()}
                  isLoading={isSubmittingEmail}
                >
                  Kirim Konfirmasi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DIALOG 3: UBAH PASSWORD ADMIN */}
      {/* ============================================================== */}
      {showPasswordDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowPasswordDialog(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-neutral-900">Ubah Kata Sandi</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Pastikan kata sandi baru memenuhi standar keamanan platform
              </p>
            </div>

            <form onSubmit={handleSubmitChangePassword} className="space-y-3.5">
              {/* Field 1: Password Saat Ini */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Password Saat Ini <span className="text-danger-600">*</span>
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showCurrentPw ? <EyeSlash size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={isSendingResetEmail}
                  onClick={handleForgotCurrentPassword}
                  className="text-[11px] text-lavender-600 hover:underline mt-1 inline-block"
                >
                  {isSendingResetEmail ? "Mengirim link..." : "Lupa password saat ini?"}
                </button>
              </div>

              {/* Field 2: Password Baru */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Password Baru <span className="text-danger-600">*</span>
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type={showNewPw ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter..."
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showNewPw ? <EyeSlash size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Real-time Validation Checklist */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasMinLength ? "bg-success-600" : "bg-neutral-300"
                      }`}
                    />
                    <span className={hasMinLength ? "text-neutral-800 font-medium" : "text-neutral-500"}>
                      Minimal 8 karakter
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasUppercase ? "bg-success-600" : "bg-neutral-300"
                      }`}
                    />
                    <span className={hasUppercase ? "text-neutral-800 font-medium" : "text-neutral-500"}>
                      Mengandung huruf besar (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasLowercase ? "bg-success-600" : "bg-neutral-300"
                      }`}
                    />
                    <span className={hasLowercase ? "text-neutral-800 font-medium" : "text-neutral-500"}>
                      Mengandung huruf kecil (a-z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasNumber ? "bg-success-600" : "bg-neutral-300"
                      }`}
                    />
                    <span className={hasNumber ? "text-neutral-800 font-medium" : "text-neutral-500"}>
                      Mengandung angka (0-9)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasSpecial ? "bg-success-600" : "bg-neutral-300"
                      }`}
                    />
                    <span className={hasSpecial ? "text-neutral-800 font-medium" : "text-neutral-500"}>
                      Mengandung karakter khusus (!@#$%^&*)
                    </span>
                  </div>
                  {currentPassword && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isDifferentFromCurrent ? "bg-success-600" : "bg-danger-500"
                        }`}
                      />
                      <span
                        className={
                          isDifferentFromCurrent ? "text-neutral-800 font-medium" : "text-danger-600 font-medium"
                        }
                      >
                        Berbeda dari password saat ini
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Field 3: Konfirmasi Password Baru */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Konfirmasi Password Baru <span className="text-danger-600">*</span>
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru..."
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showConfirmPw ? <EyeSlash size={15} /> : <Eye size={15} />}
                  </button>
                  {isMatch && (
                    <TickCircle
                      size={15}
                      className="absolute right-9 top-1/2 -translate-y-1/2 text-success-600"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPasswordDialog(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!isPasswordValid || isSubmittingPassword}
                  isLoading={isSubmittingPassword}
                >
                  Simpan Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-neutral-400">Memuat pengaturan...</div>}>
      <AdminSettingsContent />
    </Suspense>
  );
}
