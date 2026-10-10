"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sms, Lock, Eye, EyeSlash, Chart, ShieldTick, UserOctagon } from "@/lib/icons";
import { Button } from "@/components/shared/Button";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@buildmate.id");
  const [password, setPassword] = useState("Admin123!");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState("CapsLock")) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Email dan password wajib diisi.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      // Validasi admin
      if (email.includes("admin")) {
        toast.success("Berhasil masuk ke dashboard admin!");
        router.push("/admin");
      } else {
        setIsLoading(false);
        setErrorMessage("Email atau password salah, atau akun ini bukan admin.");
      }
    }, 700);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* LEFT BRAND PANEL (DESKTOP) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-lavender-50 via-lavender-100 to-lavender-200 p-12 flex-col justify-between border-r border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-lavender-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              BM
            </div>
            <span className="font-bold text-lg text-neutral-900 tracking-tight">
              BuildMate<span className="text-xs text-lavender-600 font-semibold">™</span>
            </span>
          </div>

          <div className="mt-20 max-w-md">
            <h1 className="text-4xl font-serif text-neutral-900 tracking-tight leading-tight">
              Ruang kendali <span className="italic text-lavender-700">BuildMate</span>
            </h1>
            <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
              Platform operasional satu pintu untuk memverifikasi mitra tukang, mengelola
              katalog harga tetap, dan mengawal keamanan transaksi jasa.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-lavender-600 shrink-0">
                  <Chart size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-800">
                    Pantau Semua Pesanan Realtime
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Lacak tahapan dari pembayaran hingga konfirmasi foto hasil.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-lavender-600 shrink-0">
                  <ShieldTick size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-800">
                    Kelola Dana dengan Aman (Escrow)
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Dana ditahan di rekening bersama sampai pekerjaan tuntas.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-lavender-600 shrink-0">
                  <UserOctagon size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-800">
                    Verifikasi Kualitas Mitra
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Tinjau portofolio pendaftaran mandiri sebelum tampil ke publik.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-neutral-400">
          © 2026 BuildMate SaaS. Khusus staf operasional berwenang.
        </div>
      </div>

      {/* RIGHT FORM CARD */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] bg-white rounded-3xl p-8 border border-neutral-200/90 shadow-sm space-y-6">
          <div>
            <h2 className="text-[32px] font-serif text-neutral-900 tracking-tight leading-tight">
              Masuk ke dashboard
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Khusus tim operasional BuildMate.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-xl text-xs text-danger-700 animate-in fade-in">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Sms
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@buildmate.id"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-lavender-300"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-700">
                  Kata Sandi
                </label>
                <Link
                  href="/admin/forgot-password"
                  className="text-[11px] text-lavender-600 hover:text-lavender-800 font-medium"
                >
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={handleKeyDown}
                  placeholder="••••••••"
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

              {capsLockActive && (
                <span className="text-[10px] text-warning-700 block mt-1">
                  ⚠️ Peringatan: Caps Lock aktif.
                </span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Masuk
            </Button>
          </form>

          <div className="pt-2 text-center text-[11px] text-neutral-400">
            Bukan admin?{" "}
            <Link href="/admin/denied" className="text-lavender-600 hover:underline">
              Cek status akses
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
