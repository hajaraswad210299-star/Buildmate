import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import { AuthRedirectHandler } from "@/components/auth/AuthRedirectHandler";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BuildMate — Ruang Kendali Admin & Marketplace Jasa Tukang",
  description: "Platform marketplace jasa perbaikan rumah terpercaya. Bayar aman, dana diteruskan setelah konfirmasi selesai.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
    >
      <body className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-lavender-200 selection:text-lavender-900">
        <Suspense fallback={null}>
          <AuthRedirectHandler />
        </Suspense>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: "#FFFFFF",
              color: "#16141F",
              border: "1px solid #E6E4EE",
              borderRadius: "12px",
              boxShadow: "0 8px 24px -6px rgba(22,20,31,.12)",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
