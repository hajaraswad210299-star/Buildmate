"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { PasswordField } from "@/components/auth/PasswordField";
import { Sms, Warning2 } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";

function MitraLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/mitra";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
    urlError === "email_is_customer"
      ? "Email ini terdaftar sebagai akun pelanggan. Gunakan email lain untuk mendaftar sebagai mitra."
      : urlError === "link_expired"
      ? "Link sudah kedaluwarsa. Silakan minta tautan baru."
      : ""
  );
  const [successMsg, setSuccessMsg] = useState(
    searchParams.get("verified") === "true"
      ? "Email akun mitra berhasil diverifikasi! Silakan masuk."
      : ""
  );

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");
      setUnverifiedEmail(false);

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
          setErrorMsg("Email akun mitra belum diverifikasi.");
        } else if (error.message.toLowerCase().includes("invalid login credentials")) {
          setErrorMsg("Email atau password salah. Silakan periksa kembali.");
        } else {
          setErrorMsg(error.message || "Gagal masuk. Silakan coba lagi.");
        }
        return;
      }

      if (data?.user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role === "admin") {
          router.push("/admin");
          return;
        }

        if (profile?.role === "customer") {
          setErrorMsg(
            "Email ini terdaftar sebagai akun pelanggan. Gunakan email lain untuk mendaftar sebagai mitra."
          );
          await supabase.auth.signOut();
          return;
        }

        // Role is worker: check workers row application_status (B11.8)
        const { data: worker } = await supabase
          .from("workers")
          .select("application_status")
          .eq("user_id", data.user.id)
          .maybeSingle();

        const status = worker?.application_status || "draft";

        if (status === "draft" || status === "rejected") {
          router.push("/mitra/daftar");
        } else if (status === "pending") {
          router.push("/mitra/status");
        } else {
          // Approved
          router.push(next.startsWith("/mitra") && next !== "/mitra/daftar" && next !== "/mitra/status" ? next : "/mitra");
        }
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan saat masuk.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthLayout
      title="Masuk sebagai Mitra"
      subtitle="Kelola pesanan pelanggan dan pantau pendapatan harianmu."
      isPartner={true}
    >
      <div className="space-y-4">
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-danger-50 border border-danger-200/80 text-xs text-danger-700 flex items-start gap-2.5 animate-in fade-in">
            <Warning2 size={16} className="text-danger-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <span>{errorMsg}</span>
              {unverifiedEmail && (
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  <Link
                    href={`/mitra/verify-email?email=${encodeURIComponent(email)}`}
                    className="font-medium underline text-danger-900 hover:text-danger-700 text-[11px]"
                  >
                    Buka halaman verifikasi
                  </Link>
                </div>
              )}
              {errorMsg.includes("akun pelanggan") && (
                <div>
                  <Link href="/" className="font-semibold underline hover:text-danger-800">
                    Buka beranda pelanggan →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Google OAuth Button for Worker */}
        <GoogleButton label="Lanjutkan dengan Google" signupAs="worker" next={next} />

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-neutral-200 w-full" />
          <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-neutral-400 absolute">
            atau dengan email
          </span>
        </div>

        <form onSubmit={handleLogin} className="space-y-3.5">
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700">
                Password
              </label>
              <Link
                href="/mitra/forgot-password"
                className="text-[11px] font-medium text-lavender-700 hover:underline"
              >
                Lupa password?
              </Link>
            </div>
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-lavender-600 hover:bg-lavender-700 active:bg-lavender-800 text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? "Memverifikasi..." : "Masuk ke Portal Mitra"}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-neutral-500">
          Belum jadi mitra?{" "}
          <Link
            href="/mitra/register"
            className="font-semibold text-lavender-700 hover:underline"
          >
            Daftar Sekarang
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function MitraLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-50" />}>
      <MitraLoginForm />
    </Suspense>
  );
}
