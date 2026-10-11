"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResendButton } from "@/components/auth/ResendButton";
import { Sms, TickCircle, Warning2, ArrowLeft2 } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      setErrorMsg("");

      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`;

      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      // Always show safe success message per B11.11
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal mengirim link reset password.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });
  };

  return (
    <AuthLayout
      title="Lupa password?"
      subtitle="Masukkan email akunmu untuk menerima tautan atur ulang password."
    >
      {submitted ? (
        <div className="space-y-6 text-center py-2 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
            <TickCircle size={32} variant="Bold" />
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-2xl text-neutral-900">
              Tautan Terkirim
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
              Jika email <strong>{email}</strong> terdaftar di BuildMate, link reset sudah kami kirim. Silakan periksa inbox atau folder spam emailmu.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2">
            <span className="text-xs text-neutral-400">Belum masuk?</span>
            <ResendButton onResend={handleResend} initialSeconds={60} />
          </div>

          <div className="pt-4 border-t border-neutral-100">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft2 size={14} />
              <span>Kembali ke halaman masuk</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger-50 border border-danger-200 text-danger-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <Warning2 size={16} className="text-danger-600 shrink-0 mt-0.5" />
              <p className="flex-1">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-neutral-700">
              Alamat Email Terdaftar
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
                <span>Mengirim link…</span>
              </>
            ) : (
              <span>Kirim Link Reset Password</span>
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Kembali ke halaman masuk
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
