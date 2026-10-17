"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/shared/Button";
import {
  TickCircle,
  CloseCircle,
  Eye,
  EyeSlash,
  Lock,
  ShieldTick,
  ShieldCross,
  ArrowRight,
} from "@/lib/icons";
import { toast } from "sonner";
import { getFirstAllowedRoute, PRESET_ROLES } from "@/lib/auth/permissions";

export default function AcceptInvitePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [roleData, setRoleData] = useState<{
    name: string;
    description?: string;
    permissions?: string[];
  } | null>(null);
  const [isAlreadyActive, setIsAlreadyActive] = useState(false);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Helper to load profile & role
  const loadProfileAndRole = async (currentUser: any) => {
    setUser(currentUser);
    const meta = currentUser.user_metadata || {};
    setName(meta.full_name || meta.name || "");

    if (meta.staff_status === "active") {
      setIsAlreadyActive(true);
    }

    const roleId = meta.staff_role_id;
    if (roleId) {
      const preset = PRESET_ROLES.find((r) => r.id === roleId);
      if (preset) {
        setRoleData({
          name: preset.name,
          description: preset.description,
          permissions: preset.permissions,
        });
      } else {
        try {
          const res = await fetch("/api/admin/roles");
          if (res.ok) {
            const data = await res.json();
            const found = data.roles?.find((r: any) => r.id === roleId);
            if (found) {
              setRoleData({
                name: found.name,
                description: found.description,
                permissions: found.permissions || [],
              });
            }
          }
        } catch {
          // ignore
        }
      }
    } else if (meta.role_name) {
      setRoleData({ name: meta.role_name });
    }

    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (prof?.full_name) {
        setName(prof.full_name);
      }
    } catch {
      // fallback
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Check existing session
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (!mounted) return;
      if (currentUser) {
        loadProfileAndRole(currentUser);
      } else {
        // If there's an access_token or code in URL, allow onAuthStateChange to parse it
        const hasAuthToken =
          typeof window !== "undefined" &&
          (window.location.hash.includes("access_token") ||
            window.location.hash.includes("token=") ||
            window.location.search.includes("code=") ||
            window.location.search.includes("token_hash=") ||
            window.location.search.includes("type=invite"));
        if (!hasAuthToken) {
          setLoadingUser(false);
        }
      }
    });

    // 2. Listen to auth changes (e.g. hash parsed)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session?.user) {
        loadProfileAndRole(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setLoadingUser(false);
      }
    });

    const timer = setTimeout(() => {
      if (mounted) setLoadingUser(false);
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase]);

  // Password rules validation (SPEC_ADMIN.md B11.3 & A00e)
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;
  const isMatch = confirmPassword.length > 0 && password === confirmPassword;

  // Strength score: 0 to 4
  const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumber].filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama lengkap wajib diisi.");
      return;
    }
    if (!isPasswordValid) {
      toast.error("Password belum memenuhi semua kriteria keamanan.");
      return;
    }
    if (!isMatch) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Update Auth password client-side
      const { error: authErr } = await supabase.auth.updateUser({
        password,
        data: {
          full_name: name.trim(),
          staff_status: "active",
        },
      });

      if (authErr) {
        console.warn("Client updateUser warning:", authErr.message);
      }

      // 2. Call backend endpoint to update profiles and log audit trail. The password
      //    only goes to the server if the client update failed: an admin-side password
      //    change revokes every session, which would log the new staff member out.
      const res = await fetch("/api/admin/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name.trim(),
          ...(authErr ? { password } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengaktifkan akun staf");
      }

      toast.success("Akun staf kamu berhasil diaktifkan!");

      if (authErr) {
        // Password was set server-side, so the invite session is gone: sign in again
        await supabase.auth.signOut().catch(() => {});
        router.replace("/admin/login");
        return;
      }

      // 3. Redirect to first allowed route
      const nextRoute = data.nextRoute || "/admin";
      router.replace(nextRoute === "/admin/no-access" ? "/admin" : nextRoute);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengaktifkan akun");
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-lavender-200 border-t-lavender-600 animate-spin" />
          <div className="text-xs text-neutral-500 font-medium">
            Memverifikasi tautan undangan staf BuildMate...
          </div>
        </div>
      </div>
    );
  }

  // Already Active state
  if (user && isAlreadyActive) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-success-50 border border-success-200 flex items-center justify-center mx-auto text-success-600">
            <TickCircle size={36} variant="Bulk" />
          </div>

          <div className="space-y-1.5">
            <h2 className="font-serif text-2xl text-neutral-900">Akun Anda Sudah Aktif</h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Akun staf untuk <strong>{user.email}</strong> telah aktif dan kata sandi sudah diatur sebelumnya.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/admin">
              <Button variant="primary" className="w-full">
                Buka Dashboard Staf
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Expired / Invalid state
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <ShieldCross size={36} variant="Bulk" />
          </div>

          <div className="space-y-1.5">
            <h2 className="font-serif text-2xl text-neutral-900">Undangan Kedaluwarsa</h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Tautan undangan tidak valid atau sudah kedaluwarsa. Minta Admin Utama mengirim ulang undangan kamu.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/admin/login">
              <Button variant="primary" className="w-full">
                Ke Halaman Masuk
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-sm space-y-6">
        {/* HEADER */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-lavender-50 border border-lavender-100 flex items-center justify-center mx-auto mb-3">
            <ShieldTick size={26} variant="Bulk" className="text-lavender-600" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lavender-50 border border-lavender-200 text-xs font-semibold text-lavender-800">
            <span>Peran Anda: {roleData?.name || "Staf"}</span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl text-neutral-900 tracking-tight">
            Selamat Datang di Tim <span className="italic font-serif text-lavender-700">BuildMate</span>
          </h1>

          <p className="text-xs text-neutral-500 leading-relaxed">
            {roleData?.description ||
              "Lengkapi nama dan atur kata sandi baru kamu untuk mulai menggunakan dashboard staf operasional."}
          </p>

          {roleData?.permissions && roleData.permissions.length > 0 && (
            <div className="pt-1 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-neutral-400 font-medium">Hak Akses:</span>
              {roleData.permissions.slice(0, 4).map((p) => (
                <span
                  key={p}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-white text-lavender-700 font-medium border border-lavender-200"
                >
                  {p}
                </span>
              ))}
              {roleData.permissions.length > 4 && (
                <span className="text-[10px] text-neutral-400 font-medium">
                  +{roleData.permissions.length - 4} lainnya
                </span>
              )}
            </div>
          )}
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (Readonly) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-600 block">
              Email Terdaftar
            </label>
            <input
              type="text"
              readOnly
              disabled
              value={user.email || ""}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500 cursor-not-allowed font-mono"
            />
          </div>

          {/* Nama Lengkap */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 block">
              Nama Lengkap <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama lengkap kamu"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
            />
          </div>

          {/* Password Baru */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 block">
              Password Baru <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter..."
                className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* 4-Segment Strength Indicator Bar */}
            <div className="pt-1.5 space-y-1">
              <div className="grid grid-cols-4 gap-1.5 h-1.5">
                {[1, 2, 3, 4].map((step) => {
                  let barColor = "bg-neutral-200";
                  if (strengthScore >= step) {
                    if (strengthScore <= 2) barColor = "bg-danger-500";
                    else if (strengthScore === 3) barColor = "bg-amber-500";
                    else barColor = "bg-success-500";
                  }
                  return (
                    <div
                      key={step}
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Konfirmasi Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 block">
              Konfirmasi Password <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password..."
                className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
              />
              {isMatch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-success-600 animate-in zoom-in-75 duration-150">
                  <TickCircle size={18} variant="Bold" />
                </div>
              )}
            </div>
          </div>

          {/* Real-time Security Checklist */}
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-2 text-xs">
            <span className="font-semibold text-neutral-700 block text-[11px] uppercase tracking-wider">
              Syarat Keamanan Password:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div
                className={`flex items-center gap-1.5 transition-colors ${
                  hasMinLength ? "text-success-700 font-semibold" : "text-neutral-400"
                }`}
              >
                <TickCircle size={14} variant={hasMinLength ? "Bold" : "Linear"} />
                <span>Minimal 8 karakter</span>
              </div>

              <div
                className={`flex items-center gap-1.5 transition-colors ${
                  hasUppercase ? "text-success-700 font-semibold" : "text-neutral-400"
                }`}
              >
                <TickCircle size={14} variant={hasUppercase ? "Bold" : "Linear"} />
                <span>Huruf besar (A-Z)</span>
              </div>

              <div
                className={`flex items-center gap-1.5 transition-colors ${
                  hasLowercase ? "text-success-700 font-semibold" : "text-neutral-400"
                }`}
              >
                <TickCircle size={14} variant={hasLowercase ? "Bold" : "Linear"} />
                <span>Huruf kecil (a-z)</span>
              </div>

              <div
                className={`flex items-center gap-1.5 transition-colors ${
                  hasNumber ? "text-success-700 font-semibold" : "text-neutral-400"
                }`}
              >
                <TickCircle size={14} variant={hasNumber ? "Bold" : "Linear"} />
                <span>Angka (0-9)</span>
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !isPasswordValid || !isMatch || !name.trim()}
              className="w-full flex items-center justify-center gap-2 py-3"
            >
              <span>{submitting ? "Mengaktifkan Akun..." : "Aktifkan Akun & Masuk"}</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
