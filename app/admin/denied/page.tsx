"use client";

import React from "react";
import Link from "next/link";
import { ShieldCross } from "@/lib/icons";

export default function AdminDeniedPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] bg-white rounded-3xl p-8 border border-neutral-200/90 shadow-sm text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-lavender-50 text-lavender-600 flex items-center justify-center mx-auto shadow-xs">
          <ShieldCross size={36} />
        </div>

        <div>
          <h2 className="text-2xl font-serif text-neutral-900 tracking-tight">
            Akses khusus admin
          </h2>
          <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
            Akun ini tidak memiliki izin akses ke dashboard operasional BuildMate. Halaman ini hanya diperuntukkan bagi tim internal.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Link
            href="/admin/login"
            className="w-full py-2.5 bg-lavender-600 hover:bg-lavender-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center h-11"
          >
            Masuk dengan akun lain
          </Link>

          <Link
            href="/"
            className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center h-11"
          >
            Ke halaman utama
          </Link>
        </div>
      </div>
    </div>
  );
}
