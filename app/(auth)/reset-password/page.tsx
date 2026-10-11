"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordField } from "@/components/auth/PasswordField";
import { TickCircle, Warning2 } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setErrorMsg("Password minimal 8 karakter.");
      return;
    }
    if (
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setErrorMsg("Password wajib memuat huruf besar, huruf kecil, dan angka.");
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
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Gagal mengubah password.");
        return;
      }

      // Invalidate other sessions per B11.11
      try {
        await supabase.auth.signOut({ scope: "others" });
      } catch {
        // ignore if not supported
      }

      setSuccess(true);
      toast.success("Password berhasil diubah!");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Atur ulang password"
      subtitle="Buat password baru yang aman untuk akun BuildMate kamu."
    >
      {success ? (
        <div className="space-y-6 text-center py-4 animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
            <TickCircle size={32} variant="Bold" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-2xl text-neutral-900">
              Password Berhasil Diubah
            </h3>
            <p className="text-xs text-neutral-500">
              Mengalihkanmu ke halaman masuk...
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 rounded-xl bg-lavender-600 text-white text-xs font-semibold shadow-xs"
          >
            Masuk Sekarang
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger-50 border border-danger-200 text-danger-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <Warning2 size={16} className="text-danger-600 shrink-0 mt-0.5" />
              <p className="flex-1">{errorMsg}</p>
            </div>
          )}

          <PasswordField
            label="Password Baru"
            required
            showStrength
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 karakter (huruf & angka)"
          />

          <PasswordField
            label="Ulangi Password Baru"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ketik ulang password baru"
          />

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
                <span>Menyimpan…</span>
              </>
            ) : (
              <span>Simpan Password Baru</span>
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
