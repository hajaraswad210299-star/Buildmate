"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Sms, ArrowLeft2, TickCircle } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";

export default function MitraForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      const supabase = createClient();
      const siteUrl =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");

      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${siteUrl}/auth/callback?next=/mitra/reset-password`,
      });
    } catch {
      // Intentionally neutral to prevent user enumeration
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <AuthLayout
      title="Lupa Password Mitra"
      subtitle="Masukkan email akun mitra untuk mengatur ulang password."
      isPartner={true}
    >
      <div className="space-y-4">
        {submitted ? (
          <div className="space-y-4 text-center py-2 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-success-50 text-success-600 flex items-center justify-center mx-auto border border-success-200">
              <TickCircle size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-neutral-900">
                Tautan Terkirim
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Jika email <strong className="text-neutral-800">{email}</strong> terdaftar, tautan reset password telah kami kirimkan ke inbox emailmu.
              </p>
            </div>
            <Link
              href="/mitra/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-lavender-700 hover:underline pt-2"
            >
              <ArrowLeft2 size={14} />
              <span>Kembali ke halaman masuk mitra</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                Email Akun Mitra
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

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-lavender-600 hover:bg-lavender-700 active:bg-lavender-800 text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? "Mengirim..." : "Kirim Tautan Atur Ulang"}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/mitra/login"
                className="text-xs text-neutral-500 hover:text-lavender-700 inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft2 size={13} />
                <span>Batal, kembali ke login</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
