"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { PhoneField } from "@/components/auth/PhoneField";
import {
  User,
  Crown1,
  Lock,
  Location,
  WhatsappIcon,
  LogoutCurve,
  Edit2,
  TickCircle,
  Warning2,
  ArrowRight,
  ShieldTick,
} from "@/lib/icons";
import { formatDateId } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function CustomerAccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isPlus, setIsPlus] = useState(false);
  const [plusExpiry, setPlusExpiry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Inline Profile Edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password Dialog
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Logout Confirmation Dialog
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // Track broken image fallback
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login?next=/account");
        return;
      }
      setUser(user);

      const metaAvatar =
        user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
      const metaName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "";

      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data: prof }) => {
          const role = prof?.role || user.user_metadata?.role || user.user_metadata?.signup_as;
          if (role && role !== "customer") {
            if (role === "admin" || role === "staff") {
              router.push("/admin");
            } else if (role === "worker") {
              router.push("/mitra");
            } else {
              router.push("/login?next=/account");
            }
            return;
          }

          if (prof) {
            setProfile({
              ...prof,
              avatar_url: prof.avatar_url || metaAvatar,
            });
            setName(prof.full_name || metaName);
            setPhone(prof.phone || "");
            setAddress(prof.default_address || "");
          } else {
            setProfile({
              full_name: metaName,
              avatar_url: metaAvatar,
              phone: "",
            });
            setName(metaName);
            setPhone("");
          }
        });

      fetch("/api/subscriptions/status")
        .then((res) => res.json())
        .then((data) => {
          if (data?.isPlus) {
            setIsPlus(true);
            setPlusExpiry(data.current_period_end);
          }
        })
        .catch(() => {});

      setLoading(false);
    });
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama lengkap tidak boleh kosong.");
      return;
    }
    if (!phone || phone.length < 9) {
      toast.error("Nomor WhatsApp tidak valid (minimal 9 digit).");
      return;
    }

    try {
      setSavingProfile(true);
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name.trim(),
          phone: phone.trim(),
          default_address: address.trim() || null,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData?.error || "Gagal menyimpan perubahan profil.");
      }

      setProfile((prev: any) => ({
        ...prev,
        full_name: name.trim(),
        phone: phone.trim().replace(/^\+/, ""),
        default_address: address.trim(),
      }));
      setEditingProfile(false);
      toast.success("Profil dan nomor WhatsApp berhasil disimpan!");
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan perubahan.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }

    try {
      setSavingPassword(true);
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);

      setPasswordModalOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password baru berhasil disimpan!");
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengubah password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Berhasil keluar dari akun.");
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <CustomerShell title="Akun">
        <div className="min-h-[50vh] flex items-center justify-center text-xs text-neutral-400">
          Memuat akun...
        </div>
      </CustomerShell>
    );
  }

  const isGoogleUser = user?.app_metadata?.provider === "google";

  return (
    <CustomerShell title="Akun Saya">
      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* 1. Header Profil (Avatar + Nama + Email + Badge Plus) */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/90 shadow-xs flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-lavender-100 text-lavender-700 font-bold text-2xl flex items-center justify-center overflow-hidden border-2 border-lavender-200 shrink-0">
            {profile?.avatar_url && !avatarImgFailed ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "User"}
                referrerPolicy="no-referrer"
                onError={() => setAvatarImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl text-neutral-900 truncate">
                {profile?.full_name || user?.email}
              </h1>
              {isPlus && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-lavender-100 border border-lavender-200 text-lavender-800 text-[11px] font-bold">
                  <Crown1 size={13} variant="Bold" className="text-lavender-600" />
                  <span>Plus Member</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 truncate">{user?.email}</p>
          </div>
        </div>

        {/* 2. Informasi Profil & Kontak (Inline Edit A5 C10) */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h2 className="font-serif text-xl sm:text-2xl text-neutral-900">
              Data Pribadi
            </h2>
            {!editingProfile ? (
              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-lavender-700 hover:underline"
              >
                <Edit2 size={14} />
                <span>Ubah</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="text-xs text-neutral-400 hover:text-neutral-700 font-medium"
              >
                Batal
              </button>
            )}
          </div>

          {!editingProfile ? (
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-neutral-400 block mb-0.5">Nama Lengkap</span>
                <span className="font-semibold text-neutral-900 text-sm">
                  {profile?.full_name || "-"}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5">Nomor WhatsApp</span>
                <span className="font-semibold text-neutral-900 text-sm font-mono">
                  {profile?.phone
                    ? profile.phone.startsWith("+")
                      ? profile.phone
                      : `+${profile.phone}`
                    : "-"}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5">Alamat Utama</span>
                <span className="font-medium text-neutral-800 leading-relaxed block">
                  {profile?.default_address || "Belum diatur"}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-1 animate-in fade-in">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Nama</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-lavender-600"
                />
              </div>

              <PhoneField
                value={phone}
                onChange={(val) => setPhone(val)}
                label="Nomor WhatsApp"
                required
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Alamat Utama</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-lavender-600 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="px-4 py-2 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-full bg-lavender-600 text-white text-xs font-semibold hover:bg-lavender-700 shadow-xs"
                >
                  {savingProfile ? "Menyimpan…" : "Simpan Profil"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 3. Membership BuildMate Plus */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/90 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-lavender-100 flex items-center justify-center text-lavender-700 shrink-0">
              <Crown1 size={24} variant="Bold" />
            </div>
            <div>
              <h3 className="font-serif text-xl text-neutral-900">
                {isPlus ? "BuildMate Plus Aktif" : "BuildMate Plus"}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {isPlus
                  ? `Berlaku hingga ${plusExpiry ? formatDateId(plusExpiry) : "-"}`
                  : "Bebas biaya layanan & garansi pengerjaan ulang 7 hari"}
              </p>
            </div>
          </div>

          <Link
            href="/plus"
            className="px-4 py-2 rounded-full border border-neutral-200 hover:border-lavender-600 text-xs font-semibold text-neutral-800 hover:text-lavender-700 shrink-0 transition-colors"
          >
            {isPlus ? "Kelola" : "Pelajari"}
          </Link>
        </div>

        {/* 4. Keamanan Akun */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/90 shadow-xs space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-neutral-900">
            Keamanan Akun
          </h2>

          <div className="flex items-center justify-between text-xs py-2 border-b border-neutral-100">
            <div>
              <span className="font-semibold text-neutral-800 block">Metode Masuk</span>
              <span className="text-neutral-500">
                {isGoogleUser ? "Akun Google" : "Email & Password"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs py-2">
            <div>
              <span className="font-semibold text-neutral-800 block">Password</span>
              <span className="text-neutral-500">
                {isGoogleUser ? "Login via Google OAuth" : "••••••••••••"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              className="text-xs font-semibold text-lavender-700 hover:underline"
            >
              {isGoogleUser ? "Atur Password" : "Ubah Password"}
            </button>
          </div>
        </div>

        {/* 5. Bantuan & Panduan */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-neutral-900 mb-2">
            Pusat Bantuan
          </h2>

          <a
            href="https://wa.me/6281200000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-50 transition-colors text-xs text-neutral-800 font-semibold"
          >
            <div className="flex items-center gap-3">
              <WhatsappIcon size={18} color="#079455" />
              <span>WhatsApp Bantuan BuildMate</span>
            </div>
            <ArrowRight size={14} className="text-neutral-400" />
          </a>

          <Link
            href="/#cara-kerja"
            className="flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-50 transition-colors text-xs text-neutral-800 font-semibold"
          >
            <span>Panduan Cara Kerja Rekber</span>
            <ArrowRight size={14} className="text-neutral-400" />
          </Link>
        </div>

        {/* 6. Tombol Keluar */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setLogoutModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-danger-200 text-danger-700 hover:bg-danger-50 text-xs font-semibold transition-colors"
          >
            <LogoutCurve size={16} />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </div>

      {/* CHANGE PASSWORD DIALOG */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-xl animate-in zoom-in-95">
            <h3 className="font-serif text-2xl text-neutral-900">
              Ubah Password
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <PasswordField
                label="Password Baru"
                required
                showStrength
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 karakter (huruf & angka)"
              />

              <PasswordField
                label="Ulangi Password Baru"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru"
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="h-11 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="h-11 rounded-full bg-lavender-600 text-white text-xs font-semibold hover:bg-lavender-700 shadow-xs"
                >
                  {savingPassword ? "Menyimpan…" : "Simpan Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION DIALOG */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 text-center shadow-xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-danger-50 border border-danger-200 flex items-center justify-center mx-auto text-danger-600">
              <LogoutCurve size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-2xl text-neutral-900">
                Konfirmasi Keluar
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Apakah kamu yakin ingin keluar dari akun BuildMate di perangkat ini?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="h-11 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="h-11 rounded-full bg-danger-600 text-white text-xs font-semibold hover:bg-danger-700 shadow-xs"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerShell>
  );
}
