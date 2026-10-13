"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordField } from "@/components/auth/PasswordField";
import { TickCircle, Warning2 } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";

function MitraResetPasswordContent() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setErrorMsg("Password harus memenuhi seluruh syarat keamanan.");
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
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMsg(error.message || "Gagal memperbarui password.");
        return;
      }

      // Invalidate other devices sessions (B11.11)
      try {
        await supabase.auth.signOut({ scope: "others" });
      } catch {}

      setSuccess(true);
      setTimeout(() => {
        router.push("/mitra");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Atur Ulang Password Mitra"
      subtitle="Buat password baru yang aman untuk akun mitramu."
      isPartner={true}
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-danger-50 border border-danger-200/80 text-xs text-danger-700 flex items-start gap-2.5 animate-in fade-in">
            <Warning2 size={16} className="text-danger-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-4 space-y-3 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-success-50 text-success-600 flex items-center justify-center mx-auto border border-success-200">
              <TickCircle size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-neutral-900">
                Password Berhasil Diperbarui
              </h4>
              <p className="text-xs text-neutral-500">
                Mengarahkanmu ke portal mitra...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                Password Baru
              </label>
              <PasswordField
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
              />

              {password.length > 0 && (
                <div className="grid grid-cols-2 gap-1 pt-1.5 text-[10px] text-neutral-500">
                  <span className={`flex items-center gap-1 ${hasMinLength ? "text-success-700 font-medium" : ""}`}>
                    <TickCircle size={11} className={hasMinLength ? "text-success-600" : "text-neutral-300"} />
                    ≥ 8 karakter
                  </span>
                  <span className={`flex items-center gap-1 ${hasUppercase ? "text-success-700 font-medium" : ""}`}>
                    <TickCircle size={11} className={hasUppercase ? "text-success-600" : "text-neutral-300"} />
                    Huruf besar
                  </span>
                  <span className={`flex items-center gap-1 ${hasLowercase ? "text-success-700 font-medium" : ""}`}>
                    <TickCircle size={11} className={hasLowercase ? "text-success-600" : "text-neutral-300"} />
                    Huruf kecil
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
                Konfirmasi Password Baru
              </label>
              <PasswordField
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-lavender-600 hover:bg-lavender-700 active:bg-lavender-800 text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}

export default function MitraResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-50" />}>
      <MitraResetPasswordContent />
    </Suspense>
  );
}
