"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthRedirectHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const pathname = window.location.pathname;
    const hash = window.location.hash;
    const search = window.location.search;

    // 1. Handle error in hash or query
    if (
      hash.includes("error=access_denied") ||
      hash.includes("error_code=otp_expired") ||
      search.includes("error=")
    ) {
      if (pathname.startsWith("/admin") || hash.includes("email_change")) {
        window.location.href = "/admin/login?error=link_expired";
        return;
      }
    }

    // 2. Handle email change (via hash fragment or search param)
    const isEmailChange =
      hash.includes("type=email_change") ||
      hash.includes("email_change") ||
      search.includes("type=email_change");

    if (isEmailChange) {
      // Clear hash or redirect immediately to admin settings with verified flag
      const supabase = createClient();

      // Check current user session
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          window.location.href = "/admin/settings?verified=email";
        }
      });

      // Listen for auth state change triggered by Supabase parsing the hash
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (
          event === "USER_UPDATED" ||
          event === "SIGNED_IN" ||
          session?.user
        ) {
          window.location.href = "/admin/settings?verified=email";
        }
      });

      // Fallback redirect after 800ms to guarantee user does not stay on customer home
      const timer = setTimeout(() => {
        window.location.href = "/admin/settings?verified=email";
      }, 800);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timer);
      };
    }

    // 3. Handle password recovery
    const isRecovery =
      hash.includes("type=recovery") || search.includes("type=recovery");
    if (isRecovery) {
      window.location.href = "/admin/reset-password";
      return;
    }

    // 4. If query has code or token_hash and we are on customer home '/'
    if (
      (search.includes("code=") || search.includes("token_hash=")) &&
      pathname === "/"
    ) {
      const searchParams = new URLSearchParams(search);
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      if (code || tokenHash) {
        window.location.href = `/auth/callback?${searchParams.toString()}&next=${encodeURIComponent(
          "/admin/settings?verified=email"
        )}`;
      }
    }
  }, []);

  return null;
}
