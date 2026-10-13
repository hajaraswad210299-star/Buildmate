"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCross, ArrowRight } from "@/lib/icons";
import { Button } from "@/components/shared/Button";
import { getFirstAllowedRoute } from "@/lib/auth/permissions";

export default function NoAccessPage() {
  const [firstRoute, setFirstRoute] = useState<string>("/admin");
  const [roleName, setRoleName] = useState<string>("Staf");

  useEffect(() => {
    fetch("/api/me/permissions")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const route = getFirstAllowedRoute(data.permissions || [], data.isAdmin);
          setFirstRoute(route === "/admin/no-access" ? "/admin/login" : route);
          setRoleName(data.roleName || "Staf");
        }
      })
      .catch(() => {
        // default to /admin
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-sm text-center">
        <div className="w-20 h-20 rounded-2xl bg-lavender-50 border border-lavender-100 flex items-center justify-center mx-auto mb-6">
          <ShieldCross size={48} variant="Bulk" className="text-lavender-500" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 mb-3">
          Peran: {roleName}
        </span>

        <h1 className="font-serif text-2xl md:text-3xl text-neutral-900 tracking-tight mb-3">
          Kamu tidak punya akses ke halaman ini
        </h1>

        <p className="text-sm text-neutral-500 leading-relaxed mb-8">
          Peran akun kamu tidak memiliki hak akses untuk membuka bagian ini. Jika kamu memerlukan akses, hubungi Admin Utama platform.
        </p>

        <div className="space-y-3">
          <Link href={firstRoute} className="block w-full">
            <Button variant="primary" className="w-full flex items-center justify-center gap-2">
              <span>Ke Halaman yang Diizinkan</span>
              <ArrowRight size={16} />
            </Button>
          </Link>

          <Link href="/admin/login" className="block w-full">
            <Button variant="secondary" className="w-full text-neutral-600">
              Ganti Akun Masuk
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
