"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { DEFAULT_SITE_CONTENT } from "@/lib/data/content-types";
import { ArrowLeft2 } from "@/lib/icons";

export default function TermsPage() {
  const [termsText, setTermsText] = useState(
    DEFAULT_SITE_CONTENT.legal.terms_markdown
  );

  useEffect(() => {
    fetch("/api/content")
      .then((res) => res.json())
      .then((res) => {
        if (res?.data?.content?.legal?.terms_markdown) {
          setTermsText(res.data.content.legal.terms_markdown);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <CustomerShell title="Syarat & Ketentuan" showBack backHref="/">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 mb-8 transition-colors"
        >
          <ArrowLeft2 size={14} />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 sm:p-12 shadow-xs">
          <p className="text-[11px] font-semibold text-lavender-600 uppercase tracking-widest mb-2">
            LEGAL & COMPLIANCE
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-neutral-900 tracking-tight mb-8">
            Syarat & Ketentuan Layanan
          </h1>

          <div className="prose prose-neutral max-w-none text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap font-sans">
            {termsText}
          </div>
        </div>
      </main>
    </CustomerShell>
  );
}
