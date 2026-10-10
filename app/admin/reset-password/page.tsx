"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeSlash, TickCircle } from "@/lib/icons";
import { Button } from "@/components/shared/Button";
import { toast } from "sonner";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Strength checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  const passedCount = [hasMinLength, hasUppercase, hasLowercase, hasNumber].filter(Boolean).length;
  const isMatch = newPassword && newPassword === confirmPassword;
  const isValid = passedCount === 4 && isMatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Kata sandi berhasil diperbarui!");
      router.push("/admin");
    }, 700);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] bg-white rounded-3xl p-8 border border-neutral-200/90 shadow-sm space-y-6">
        <div>
          <h2 className="text-[30px] font-serif text-neutral-900 tracking-tight leading-tight">
            Atur kata sandi baru
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Buat kata sandi baru yang aman untuk akun operasional admin kamu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">
              Kata Sandi Baru
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter..."
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-lavender-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* 4-segment strength bar */}
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[1, 2, 3, 4].map((seg) => (
                <div
                  key={seg}
                  className={`h-1.5 rounded-full transition-colors ${
                    passedCount >= seg
                      ? passedCount <= 2
                        ? "bg-warning-500"
                        : "bg-success-600"
                      : "bg-neutral-200"
                  }`}
                />
              ))}
            </div>

            {/* Realtime rules checklist */}
            <div className="mt-3 space-y-1.5 text-[11px] text-neutral-500">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    hasMinLength ? "bg-success-600" : "bg-neutral-300"
                  }`}
                />
                <span className={hasMinLength ? "text-neutral-800 font-medium" : ""}>
                  Minimal 8 karakter
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    hasUppercase ? "bg-success-600" : "bg-neutral-300"
                  }`}
                />
                <span className={hasUppercase ? "text-neutral-800 font-medium" : ""}>
                  Mengandung huruf besar (A-Z)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    hasLowercase ? "bg-success-600" : "bg-neutral-300"
                  }`}
                />
                <span className={hasLowercase ? "text-neutral-800 font-medium" : ""}>
                  Mengandung huruf kecil (a-z)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    hasNumber ? "bg-success-600" : "bg-neutral-300"
                  }`}
                />
                <span className={hasNumber ? "text-neutral-800 font-medium" : ""}>
                  Mengandung angka (0-9)
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">
              Konfirmasi Kata Sandi Baru
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru..."
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-lavender-300"
              />
              {isMatch && (
                <TickCircle
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-success-600"
                />
              )}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!isValid || isLoading}
            isLoading={isLoading}
          >
            Simpan Kata Sandi
          </Button>
        </form>
      </div>
    </div>
  );
}
