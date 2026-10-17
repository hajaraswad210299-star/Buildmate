"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { PasswordField } from "@/components/auth/PasswordField";
import { Sms, Warning2 } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
    searchParams.get("error") === "link_expired"
      ? "Link sudah kedaluwarsa. Silakan minta tautan baru."
      : ""
  );
  const [successMsg, setSuccessMsg] = useState(
    searchParams.get("verified") === "true"
      ? "Email berhasil diverifikasi! Silakan masukkan password untuk masuk."
      : ""
  );
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState("");

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");
      setUnverifiedEmail(false);
      setResendStatus("");

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("email not confirmed") ||
          error.message.toLowerCase().includes("not verified")
        ) {
          setUnverifiedEmail(true);
          setErrorMsg("Email kamu belum diverifikasi.");
        } else if (error.message.toLowerCase().includes("invalid login credentials")) {
          setErrorMsg("Email atau password salah. Silakan periksa kembali.");
        } else {
          setErrorMsg(error.message || "Gagal masuk. Silakan coba lagi.");
        }
        return;
      }

      if (data?.user) {
        // Check profile role & onboarding
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, onboarding_completed, phone")
          .eq("id", data.user.id)
          .single();

        if (profile?.role === "admin") {
          router.push("/admin");
          return;
        }

        if (profile?.role === "worker") {
          router.push("/mitra");
          return;
        }

        const customerNext =
          next && !next.startsWith("/admin") && !next.startsWith("/mitra")
            ? next
            : "/";

        if (!profile?.onboarding_completed || !profile?.phone) {
          router.push(`/welcome?next=${encodeURIComponent(customerNext)}`);
          return;
        }

        router.push(customerNext);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan saat masuk.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndLogin = async () => {
    if (!email) return;
    try {
      setLoading(true);
      setErrorMsg("");
      setResendStatus("Memverifikasi email...");
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Gagal verifikasi");
      }
      setResendStatus("Email terverifikasi! Sedang masuk...");
      setUnverifiedEmail(false);
      await handleLogin();
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal memverifikasi akun.");
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    try {
      setResendStatus("Mengirim...");
      const supabase = createClient();
      const siteUrl =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setResendStatus("Link verifikasi baru telah dikirim ke emailmu.");
    } catch {
      setResendStatus("Gagal mengirim ulang email verifikasi.");
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {/* Google OAuth Button */}
      <GoogleButton label="Lanjutkan dengan Google" next={next} />

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white lg:bg-cream-50 px-3 text-neutral-400 font-medium">
            atau dengan email
          </span>
        </div>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-danger-50 border border-danger-200 text-danger-800 text-xs flex items-start gap-2.5 animate-in fade-in">
          <Warning2 size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{errorMsg}</p>
            {unverifiedEmail && (
              <div className="mt-2.5 flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={handleVerifyAndLogin}
                  className="px-2.5 py-1 rounded-lg bg-danger-600 hover:bg-danger-700 active:scale-95 text-white font-semibold text-[11px] transition-all"
                >
                  Verifikasi & Masuk Sekarang
                </button>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="font-medium underline text-danger-900 hover:text-danger-700 text-[11px]"
                >
                  Kirim ulang email
                </button>
              </div>
            )}
            {resendStatus && (
              <p className="mt-1 text-[11px] text-emerald-700 font-medium">{resendStatus}</p>
            )}
          </div>
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-1.5 text-left">
        <label className="block text-xs font-semibold text-neutral-700">
          Email
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Sms size={18} />
          </div>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className="w-full h-12 pl-10 pr-3 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 focus:border-lavender-600 focus:ring-4 focus:ring-lavender-100 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-1">
        <PasswordField
          label="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Masukkan password kamu"
        />
        <div className="text-right pt-0.5">
          <Link
            href="/forgot-password"
            className="text-[11px] font-semibold text-lavender-700 hover:text-lavender-800 transition-colors"
          >
            Lupa password?
          </Link>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl bg-lavender-600 hover:bg-lavender-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-white"
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
            <span>Masuk…</span>
          </>
        ) : (
          <span>Masuk</span>
        )}
      </button>

      {/* Register Footer */}
      <div className="text-center pt-3 text-xs text-neutral-500">
        <span>Belum punya akun BuildMate? </span>
        <Link
          href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-bold text-lavender-700 hover:text-lavender-800 transition-colors"
        >
          Daftar sekarang
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout
      title="Selamat datang kembali"
      subtitle="Masuk untuk memesan tukang dan memantau pekerjaanmu."
    >
      <Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-neutral-400">Memuat formulir masuk...</div>}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
