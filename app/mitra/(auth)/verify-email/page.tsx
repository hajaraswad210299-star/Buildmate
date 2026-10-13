"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SmsTracking, ArrowRight } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";

function MitraVerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "emailmu";

  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (!canResend) return;

    try {
      setResendStatus("Mengirim...");
      const supabase = createClient();
      const siteUrl =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=/mitra/daftar`,
        },
      });

      if (error) {
        setResendStatus("Gagal mengirim ulang. Coba lagi.");
      } else {
        setResendStatus("Email verifikasi telah dikirim ulang!");
        setCanResend(false);
        setCountdown(60);
      }
    } catch {
      setResendStatus("Gagal mengirim ulang.");
    }
  };

  return (
    <AuthLayout
      title="Cek Inbox Email Kamu"
      subtitle="Kami telah mengirimkan tautan verifikasi akun mitra."
      isPartner={true}
    >
      <div className="text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-lavender-50 border border-lavender-200/80 text-lavender-600 flex items-center justify-center mx-auto shadow-xs">
          <SmsTracking size={32} variant="Bulk" />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-neutral-600 leading-relaxed">
            Klik tautan verifikasi yang kami kirimkan ke:
            <br />
            <strong className="text-neutral-900 font-semibold">{email}</strong>
          </p>
          <p className="text-[11px] text-neutral-400">
            Setelah email terverifikasi, kamu akan langsung diarahkan ke formulir data mitra.
          </p>
        </div>

        {resendStatus && (
          <p className="text-xs font-medium text-lavender-700 bg-lavender-50 p-2.5 rounded-xl border border-lavender-200 animate-in fade-in">
            {resendStatus}
          </p>
        )}

        <div className="space-y-2.5 pt-2">
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 rounded-xl bg-lavender-600 hover:bg-lavender-700 active:bg-lavender-800 text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Buka Gmail</span>
            <ArrowRight size={16} />
          </a>

          <button
            type="button"
            disabled={!canResend}
            onClick={handleResend}
            className="w-full h-11 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {canResend
              ? "Kirim Ulang Email Verifikasi"
              : `Kirim ulang dalam ${countdown} detik`}
          </button>
        </div>

        <div className="pt-2">
          <Link
            href="/mitra/register"
            className="text-xs text-neutral-500 hover:text-lavender-700 transition-colors"
          >
            Salah ketik email? Ubah email pendaftaran
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function MitraVerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-50" />}>
      <MitraVerifyEmailContent />
    </Suspense>
  );
}
