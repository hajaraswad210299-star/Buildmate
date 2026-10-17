"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { PasswordField } from "@/components/auth/PasswordField";
import { PhoneField } from "@/components/auth/PhoneField";
import { Sms, User, Warning2, InfoCircle } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";

// Common email domain typos helper (A4 C02b)
function getEmailSuggestion(email: string): string | null {
  if (!email || !email.includes("@")) return null;
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const domain = parts[1].toLowerCase();
  const typoMap: Record<string, string> = {
    "gmai.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gmial.com": "gmail.com",
    "yaho.com": "yahoo.com",
    "yahooo.com": "yahoo.com",
    "hotmial.com": "hotmail.com",
  };
  if (typoMap[domain]) {
    return `${parts[0]}@${typoMap[domain]}`;
  }
  return null;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const suggestion = getEmailSuggestion(email);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = "Nama lengkap wajib diisi.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Format email tidak valid.";
    }
    if (!phone || phone.length < 11 || phone.length > 15) {
      errors.phone = "Nomor WhatsApp harus antara 9-13 digit (mis. 0812...).";
    }
    if (password.length < 8) {
      errors.password = "Password minimal 8 karakter.";
    } else if (
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      errors.password = "Password wajib memuat huruf besar, huruf kecil, dan angka.";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Konfirmasi password tidak cocok.";
    }
    if (!agreeTerms) {
      errors.terms = "Kamu harus menyetujui Syarat Layanan & Kebijakan Privasi.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      setErrorMsg("");

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role: "customer",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal membuat akun.");
        return;
      }

      // Automatically sign in client session so user transitions seamlessly
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      // Redirect to verify-email according to C02c spec
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan saat pendaftaran.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {/* Google OAuth Button */}
      <GoogleButton label="Daftar dengan Google" next={next} />

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white lg:bg-cream-50 px-3 text-neutral-400 font-medium">
            atau lengkapi formulir
          </span>
        </div>
      </div>

      {/* Global Error Alert */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-danger-50 border border-danger-200 text-danger-800 text-xs flex items-start gap-2.5 animate-in fade-in">
          <Warning2 size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="flex-1">{errorMsg}</p>
        </div>
      )}

      {/* Full Name */}
      <div className="space-y-1.5 text-left">
        <label className="block text-xs font-semibold text-neutral-700">
          Nama Lengkap <span className="text-danger-600">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <User size={18} />
          </div>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="mis. Siti Rahmawati"
            className="w-full h-12 pl-10 pr-3 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 focus:border-lavender-600 focus:ring-4 focus:ring-lavender-100 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all shadow-xs"
          />
        </div>
        {fieldErrors.fullName && (
          <p className="text-[11px] text-danger-600 font-medium">{fieldErrors.fullName}</p>
        )}
      </div>

      {/* Email Field with typo suggestion */}
      <div className="space-y-1.5 text-left">
        <label className="block text-xs font-semibold text-neutral-700">
          Alamat Email <span className="text-danger-600">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Sms size={18} />
          </div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className="w-full h-12 pl-10 pr-3 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 focus:border-lavender-600 focus:ring-4 focus:ring-lavender-100 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all shadow-xs"
          />
        </div>
        {suggestion && (
          <div className="p-2 rounded-lg bg-lavender-50 border border-lavender-200 text-lavender-800 text-[11px] flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <InfoCircle size={14} className="text-lavender-600" />
              <span>Maksud kamu <strong>{suggestion}</strong>?</span>
            </div>
            <button
              type="button"
              onClick={() => setEmail(suggestion)}
              className="text-[11px] font-bold text-lavender-700 hover:underline"
            >
              Gunakan
            </button>
          </div>
        )}
        {fieldErrors.email && (
          <p className="text-[11px] text-danger-600 font-medium">{fieldErrors.email}</p>
        )}
      </div>

      {/* WhatsApp Phone */}
      <PhoneField
        label="Nomor WhatsApp"
        required
        value={phone}
        onChange={(val) => setPhone(val)}
        error={fieldErrors.phone}
      />

      {/* Password with Strength Indicator */}
      <PasswordField
        label="Password"
        required
        showStrength
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        placeholder="Min. 8 karakter (huruf & angka)"
      />

      {/* Confirm Password */}
      <PasswordField
        label="Konfirmasi Password"
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={fieldErrors.confirmPassword}
        placeholder="Ulangi password kamu"
      />

      {/* Terms & Privacy Checkbox */}
      <div className="pt-1">
        <label className="flex items-start gap-2.5 cursor-pointer text-xs text-neutral-600 select-none">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-0.5 rounded border-neutral-300 text-lavender-600 focus:ring-lavender-500 w-4 h-4"
          />
          <span className="leading-relaxed">
            Saya menyetujui{" "}
            <span className="font-semibold text-neutral-800 hover:underline">
              Syarat Layanan
            </span>{" "}
            dan{" "}
            <span className="font-semibold text-neutral-800 hover:underline">
              Kebijakan Privasi
            </span>{" "}
            BuildMate.
          </span>
        </label>
        {fieldErrors.terms && (
          <p className="text-[11px] text-danger-600 font-medium pt-1">
            {fieldErrors.terms}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl bg-lavender-600 hover:bg-lavender-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-4"
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
            <span>Membuat akun…</span>
          </>
        ) : (
          <span>Daftar Akun</span>
        )}
      </button>

      {/* Login Footer */}
      <div className="text-center pt-3 text-xs text-neutral-500">
        <span>Sudah punya akun BuildMate? </span>
        <Link
          href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-bold text-lavender-700 hover:text-lavender-800 transition-colors"
        >
          Masuk di sini
        </Link>
      </div>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Buat akun BuildMate"
      subtitle="Pesan tukang terverifikasi dan bayar aman lewat rekening bersama."
    >
      <Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-neutral-400">Memuat formulir pendaftaran...</div>}>
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  );
}
