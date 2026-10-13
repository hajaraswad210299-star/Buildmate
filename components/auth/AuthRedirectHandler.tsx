"use client";

import { useEffect } from "react";

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
        window.history.replaceState(null, "", pathname + search);
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
      // Immediately clean hash from URL to avoid re-triggering redirect loop
      window.history.replaceState(null, "", pathname + search);

      if (pathname.startsWith("/admin/settings")) {
        return;
      }

      if (pathname.startsWith("/admin/denied") || pathname.startsWith("/admin/login")) {
        return;
      }

      window.location.href = "/admin/settings?verified=email";
      return;
    }

    // 3. Handle password recovery
    const isRecovery =
      hash.includes("type=recovery") || search.includes("type=recovery");
    if (isRecovery) {
      window.history.replaceState(null, "", pathname + search);
      if (!pathname.startsWith("/admin/reset-password")) {
        window.location.href = "/admin/reset-password";
      }
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
