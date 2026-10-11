"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sms, SmsTracking, ArrowLeft2 } from "@/lib/icons";
import { Button } from "@/components/shared/Button";

import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isSent && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSent, countdown]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const siteUrl = window.location.origin;
      const redirectTo = `${siteUrl}/auth/callback?next=/admin/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setIsSent(true);
        setCountdown(60);
        toast.success("Tautan pemulihan kata sandi telah dikirim ke email kamu.");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim link pemulihan kata sandi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] bg-white rounded-3xl p-8 border border-neutral-200/90 shadow-sm space-y-6">
        <div>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-lavender-700 transition-colors mb-4"
          >
            <ArrowLeft2 size={14} />
            <span>Kembali ke halaman masuk</span>
          </Link>

          <h2 className="text-[30px] font-serif text-neutral-900 tracking-tight leading-tight">
            Lupa kata sandi?
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Masukkan email terdaftar untuk menerima tautan pemulihan kata sandi.
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                Alamat Email Admin
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Kirim link reset
            </Button>
          </form>
        ) : (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 bg-lavender-50 rounded-2xl border border-lavender-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-lavender-600 mx-auto">
                <SmsTracking size={20} />
              </div>
              <h3 className="text-xs font-bold text-lavender-900">Email Terkirim</h3>
              <p className="text-[11px] text-lavender-800 leading-relaxed">
                Jika email terdaftar, tautan reset sudah kami kirim. Silakan cek inbox atau folder spam email kamu.
              </p>
            </div>

            <button
              type="button"
              disabled={countdown > 0 || isLoading}
              onClick={() => handleSubmit()}
              className="w-full py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
            >
              {countdown > 0
                ? `Kirim ulang dalam (${countdown}s)`
                : "Kirim ulang link reset"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
