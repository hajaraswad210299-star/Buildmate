"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { PasswordField } from "@/components/auth/PasswordField";
import { PhoneField } from "@/components/auth/PhoneField";
import { User, Sms, Warning2, TickCircle } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";

function MitraRegisterForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Password rules validation (B11.3)
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;
  const isConfirmMatching = password && confirmPassword ? password === confirmPassword : true;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setErrorMsg("Harap setujui syarat & ketentuan mitra BuildMate.");
      return;
    }
    if (!isPasswordValid) {
      setErrorMsg("Password harus memenuhi seluruh kriteria keamanan.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const supabase = createClient();
      const siteUrl =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=/mitra/daftar`,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            signup_as: "worker",
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          setErrorMsg("Email sudah terdaftar. Silakan masuk atau reset password.");
        } else {
          setErrorMsg(error.message || "Gagal mendaftar. Silakan coba lagi.");
        }
        return;
      }

      if (data?.user) {
        router.push(`/mitra/verify-email?email=${encodeURIComponent(email.trim())}`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan saat pendaftaran.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Gabung jadi Mitra BuildMate"
      subtitle="Gratis, tanpa biaya pendaftaran."
      isPartner={true}
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-danger-50 border border-danger-200/80 text-xs text-danger-700 flex items-start gap-2.5 animate-in fade-in">
            <Warning2 size={16} className="text-danger-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <GoogleButton
          label="Daftar dengan Google"
          signupAs="worker"
          next="/mitra/daftar"
        />

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-neutral-200 w-full" />
          <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-neutral-400 absolute">
            atau isi formulir
          </span>
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Nama Lengkap
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama lengkap sesuai KTP"
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-lavender-300 focus:border-lavender-600 transition-all"
              />
              <User size={16} className="absolute left-3.5 top-3 text-neutral-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-lavender-300 focus:border-lavender-600 transition-all"
              />
              <Sms size={16} className="absolute left-3.5 top-3 text-neutral-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Nomor WhatsApp
            </label>
            <PhoneField
              value={phone}
              onChange={setPhone}
              placeholder="812-3456-7890"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Password
            </label>
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
            />

            {/* Checklist Validasi Password */}
            {password.length > 0 && (
              <div className="grid grid-cols-2 gap-1 pt-1.5 text-[10px] text-neutral-500">
                <span className={`flex items-center gap-1 ${hasMinLength ? "text-success-700 font-medium" : ""}`}>
                  <TickCircle size={11} className={hasMinLength ? "text-success-600" : "text-neutral-300"} />
                  ≥ 8 karakter
                </span>
                <span className={`flex items-center gap-1 ${hasUppercase ? "text-success-700 font-medium" : ""}`}>
                  <TickCircle size={11} className={hasUppercase ? "text-success-600" : "text-neutral-300"} />
                  Huruf besar (A-Z)
                </span>
                <span className={`flex items-center gap-1 ${hasLowercase ? "text-success-700 font-medium" : ""}`}>
                  <TickCircle size={11} className={hasLowercase ? "text-success-600" : "text-neutral-300"} />
                  Huruf kecil (a-z)
                </span>
                <span className={`flex items-center gap-1 ${hasNumber ? "text-success-700 font-medium" : ""}`}>
                  <TickCircle size={11} className={hasNumber ? "text-success-600" : "text-neutral-300"} />
                  Angka (0-9)
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Konfirmasi Password
            </label>
            <PasswordField
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password"
            />
            {confirmPassword && !isConfirmMatching && (
              <p className="text-[10px] text-danger-600 mt-1">
                Password tidak cocok.
              </p>
            )}
          </div>

          <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 accent-lavender-600 w-4 h-4 rounded"
            />
            <span className="text-[11px] text-neutral-600 leading-relaxed">
              Saya menyetujui{" "}
              <Link href="/terms" className="text-lavender-700 underline font-medium">
                Syarat & Ketentuan Mitra
              </Link>{" "}
              dan{" "}
              <Link href="/privacy" className="text-lavender-700 underline font-medium">
                Kebijakan Privasi
              </Link>{" "}
              BuildMate.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !agreeTerms}
            className="w-full h-12 rounded-xl bg-lavender-600 hover:bg-lavender-700 active:bg-lavender-800 text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? "Mendaftarkan Akun..." : "Daftar sebagai Mitra"}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-neutral-500">
          Sudah punya akun mitra?{" "}
          <Link
            href="/mitra/login"
            className="font-semibold text-lavender-700 hover:underline"
          >
            Masuk
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function MitraRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-50" />}>
      <MitraRegisterForm />
    </Suspense>
  );
}
