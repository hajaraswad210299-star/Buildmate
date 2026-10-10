"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@/lib/icons";

export default function HomePage() {
  const router = useRouter();

  // Auto redirect to /admin since we are in Phase 1 (Admin build)
  useEffect(() => {
    router.push("/admin");
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md bg-white p-8 rounded-3xl border border-neutral-200/90 shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-lavender-600 text-white font-bold text-lg flex items-center justify-center mx-auto shadow-xs">
          BM
        </div>

        <div>
          <h1 className="text-3xl font-serif text-neutral-900 tracking-tight">
            BuildMate<span className="italic text-lavender-700">™</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-2">
            Mengalihkan ke Ruang Kendali Admin BuildMate...
          </p>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <span>Masuk ke Dashboard Admin</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
