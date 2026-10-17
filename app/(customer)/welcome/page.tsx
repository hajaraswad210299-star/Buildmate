"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneField } from "@/components/auth/PhoneField";
import { User, Location, TickCircle, Warning2, ArrowRight } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function WelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // B11.11: only internal customer paths are allowed as redirect targets
  const rawNext = searchParams.get("next") || "/";
  const next =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\") &&
    !rawNext.startsWith("/admin") &&
    !rawNext.startsWith("/mitra")
      ? rawNext
      : "/";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setFullName(
          user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            ""
        );
        if (user.user_metadata?.phone) {
          setPhone(user.user_metadata.phone);
        }

        supabase
          .from("profiles")
          .select("full_name, phone, default_address, onboarding_completed")
          .eq("id", user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              if (profile.full_name) setFullName(profile.full_name);
              if (profile.phone) setPhone(profile.phone);
              if (profile.default_address) setAddress(profile.default_address);
            }
            setFetching(false);
          });
      } else {
        setFetching(false);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setErrorMsg("Nama lengkap wajib diisi.");
      return;
    }
    if (!phone || phone.length < 11 || phone.length > 15) {
      setErrorMsg("Nomor WhatsApp harus antara 9-13 digit (mis. 0812...).");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          default_address: address.trim() || null,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData?.error || "Gagal menyimpan nomor WhatsApp.");
      }

      toast.success("Profil berhasil dilengkapi!");
      router.push(next);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan saat menyimpan profil.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-neutral-400">
        Menyiapkan akunmu...
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/90 shadow-sm space-y-6">
      {/* Progress Bar / Step indicator */}
      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-lavender-700">Langkah Terakhir</span>
          <span className="text-neutral-400">Lengkapi Profil</span>
        </div>
        <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
          <div className="h-full bg-lavender-600 rounded-full w-full animate-in slide-in-from-left duration-500" />
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="font-serif text-3xl text-neutral-900 tracking-tight">
          Satu langkah lagi
        </h1>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Mohon lengkapi nomor kontak WhatsApp agar tukang dan tim BuildMate dapat berkoordinasi saat pesanan berjalan.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-danger-50 border border-danger-200 text-danger-800 text-xs flex items-start gap-2.5 animate-in fade-in">
          <Warning2 size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="flex-1">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold text-neutral-700">
            Nama Lengkap <span className="text-danger-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <User size={18} />
            </div>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama lengkap kamu"
              className="w-full h-12 pl-10 pr-3 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 focus:border-lavender-600 focus:ring-4 focus:ring-lavender-100 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all shadow-xs"
            />
          </div>
        </div>

        {/* WhatsApp Phone (mandatory) */}
        <PhoneField
          label="Nomor WhatsApp"
          required
          value={phone}
          onChange={(val) => setPhone(val)}
        />
        <p className="text-[11px] text-neutral-400 -mt-2">
          Wajib diisi untuk verifikasi pemesanan & koordinasi kedatangan tukang.
        </p>

        {/* Default Address (optional) */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold text-neutral-700">
            Alamat Rumah Utama <span className="text-neutral-400 font-normal">(opsional)</span>
          </label>
          <div className="relative">
            <div className="absolute top-3.5 left-3.5 pointer-events-none text-neutral-400">
              <Location size={18} />
            </div>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="mis. Jl. Tebet Timur Dalam No. 12, RT 04 / RW 06, Tebet, Jakarta Selatan"
              className="w-full pl-10 pr-3 py-3 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 focus:border-lavender-600 focus:ring-4 focus:ring-lavender-100 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all shadow-xs resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-lavender-600 hover:bg-lavender-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-4"
        >
          {loading ? (
            <span>Menyimpan profil…</span>
          ) : (
            <>
              <span>Simpan & Lanjutkan</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4 sm:p-6">
      <Suspense fallback={<div className="text-xs text-neutral-400">Memuat...</div>}>
        <WelcomeContent />
      </Suspense>
    </div>
  );
}
