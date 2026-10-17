"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResendButton } from "@/components/auth/ResendButton";
import { SmsTracking, ArrowRight } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "emailmu";
  const [toastMsg, setToastMsg] = useState("");

  const isGmail = email.toLowerCase().includes("@gmail.com");

  const handleResend = async () => {
    if (!email || email === "emailmu") return;
    try {
      const supabase = createClient();
      const siteUrl =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=/`,
        },
      });
      setToastMsg("Email verifikasi telah dikirim ulang!");
      setTimeout(() => setToastMsg(""), 4000);
    } catch {
      setToastMsg("Gagal mengirim ulang. Silakan coba sebentar lagi.");
    }
  };

  return (
    <div className="text-center space-y-6 py-4">
      {/* 72px Icon in lavender-50 circle with gentle floating micro-interaction */}
      <div className="w-20 h-20 rounded-full bg-lavender-50 border border-lavender-200/60 flex items-center justify-center mx-auto text-lavender-600 shadow-sm animate-bounce-gentle">
        <SmsTracking size={40} variant="Bulk" />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
          Kami telah mengirim link aktivasi ke alamat email:
        </p>
        <p className="text-sm font-bold text-neutral-900 bg-neutral-100/80 px-3 py-1.5 rounded-lg inline-block font-mono">
          {email}
        </p>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed pt-1">
          Klik tombol atau link di dalam email tersebut untuk mengonfirmasi akun dan melanjutkan pemesanan.
        </p>
      </div>

      {toastMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-in fade-in">
          {toastMsg}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={async () => {
            try {
              setToastMsg("Mengaktifkan akun...");
              if (email && email !== "emailmu") {
                await fetch("/api/auth/verify-email", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: email.trim() }),
                });
              }

              const supabase = createClient();
              const { data: { user } } = await supabase.auth.getUser();

              if (user) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("onboarding_completed, phone")
                  .eq("id", user.id)
                  .maybeSingle();

                if (!profile?.onboarding_completed || !profile?.phone) {
                  window.location.href = `/welcome?next=${encodeURIComponent(searchParams.get("next") || "/")}`;
                  return;
                }
                window.location.href = searchParams.get("next") || "/";
              } else {
                window.location.href = `/login?email=${encodeURIComponent(email)}&verified=true`;
              }
            } catch {
              window.location.href = `/login?email=${encodeURIComponent(email)}&verified=true`;
            }
          }}
          className="w-full h-12 rounded-xl bg-lavender-600 hover:bg-lavender-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2"
        >
          <span>Aktifkan Akun & Lanjutkan</span>
          <ArrowRight size={14} />
        </button>

        {isGmail && (
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 active:scale-[0.98] text-xs font-semibold transition-all flex items-center justify-center gap-2"
          >
            <span>Buka Gmail</span>
          </a>
        )}

        <div className="pt-2 flex items-center justify-center gap-2">
          <span className="text-xs text-neutral-400">Tidak menerima email?</span>
          <ResendButton onResend={handleResend} initialSeconds={60} />
        </div>
      </div>

      {/* Change email link */}
      <div className="pt-4 border-t border-neutral-100 text-xs text-neutral-500">
        <span>Salah menulis email? </span>
        <Link
          href="/register"
          className="font-bold text-lavender-700 hover:text-lavender-800 transition-colors"
        >
          Ubah email pendaftaran
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthLayout
      title="Cek emailmu"
      subtitle="Satu langkah lagi untuk mengaktifkan akun BuildMate kamu."
    >
      <Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-neutral-400">Memuat info verifikasi...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </AuthLayout>
  );
}
