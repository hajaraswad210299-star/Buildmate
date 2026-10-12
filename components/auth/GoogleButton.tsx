"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface GoogleButtonProps {
  label?: string;
  next?: string;
  signupAs?: "customer" | "worker";
}

export function GoogleButton({
  label = "Lanjutkan dengan Google",
  next = "/",
  signupAs = "customer",
}: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dynamic Supabase URLs for setup assistance
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://izryebajgljqffgixqak.supabase.co";
  const projectRef = supabaseUrl.includes("supabase.co")
    ? supabaseUrl.replace("https://", "").split(".")[0]
    : "izryebajgljqffgixqak";
  const callbackUrl = `${supabaseUrl}/auth/v1/callback`;
  const dashboardProvidersUrl = `https://supabase.com/dashboard/project/${projectRef}/auth/providers`;

  const handleCopyCallbackUrl = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const siteUrl =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");

      const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(
        next
      )}&as=${signupAs}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes("provider is not enabled") ||
          error.message?.toLowerCase().includes("validation_failed")
        ) {
          setShowSetupModal(true);
          setLoading(false);
          return;
        }
        console.error("Google sign in error:", error.message);
        setLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Google auth exception:", err);
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full h-12 flex items-center justify-center gap-3 px-4 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/80 active:scale-[0.98] transition-all text-xs font-semibold text-neutral-800 shadow-xs disabled:opacity-70 disabled:pointer-events-none"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-lavender-600"
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
            <span>Menghubungkan ke Google…</span>
          </span>
        ) : (
          <>
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{label}</span>
          </>
        )}
      </button>

      {/* Supabase Google Provider Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-neutral-100 animate-in zoom-in-95 duration-200 text-left">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/70 text-lg shrink-0">
                  ⚠️
                </span>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 leading-tight">
                    Google Sign-In Belum Diaktifkan
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Supabase Provider: <code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-mono">provider is not enabled</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors"
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            {/* Explanation */}
            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              Pesan error di atas terjadi karena opsi provider <strong>Google</strong> belum diaktifkan di dashboard Supabase proyek Anda.
            </p>

            {/* Step-by-Step Instructions */}
            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 mb-5 space-y-3 text-xs text-neutral-700">
              <p className="font-semibold text-neutral-900">
                Langkah Cepat Mengaktifkan (Hanya 2 Menit):
              </p>
              <ol className="list-decimal list-inside space-y-2 text-[12px] text-neutral-600">
                <li>
                  Buka menu{" "}
                  <a
                    href={dashboardProvidersUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-lavender-700 hover:underline"
                  >
                    Supabase Auth Providers ↗
                  </a>
                </li>
                <li>
                  Cari provider <strong>Google</strong>, lalu aktifkan switch <strong>Enable Google provider</strong>.
                </li>
                <li>
                  Masukkan <strong>Client ID</strong> & <strong>Client Secret</strong> dari Google Cloud Console.
                </li>
                <li>
                  Di Google Cloud Console, tambahkan URL redirect ini ke bagian <em>Authorized redirect URIs</em>:
                </li>
              </ol>

              {/* Callback URL with Copy Button */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-neutral-200">
                <code className="text-[11px] font-mono text-neutral-800 truncate select-all">
                  {callbackUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyCallbackUrl}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-[11px] font-semibold text-neutral-700 shrink-0 transition-all"
                >
                  {copied ? "Tersalin! ✓" : "Salin URL"}
                </button>
              </div>
            </div>

            {/* Practical Dev Note */}
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200/70 text-[11px] text-emerald-800 mb-5 flex items-start gap-2">
              <span className="shrink-0 mt-0.5">💡</span>
              <p>
                <strong>Opsi Praktis Sekarang:</strong> Anda dapat langsung masuk atau mendaftar menggunakan formulir <strong>Email & Password</strong> di bawah yang sudah aktif 100%.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-1">
              <a
                href={dashboardProvidersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold text-center transition-colors"
              >
                Buka Supabase Dashboard ↗
              </a>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold transition-colors"
              >
                Gunakan Email & Password
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
