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

    // 4. Handle staff invite via URL parameters/hash
    const isInvite =
      hash.includes("type=invite") ||
      search.includes("type=invite") ||
      hash.includes("accept-invite") ||
      search.includes("accept-invite");
    if (isInvite) {
      if (!pathname.startsWith("/admin/accept-invite")) {
        window.location.href = `/admin/accept-invite${hash || search}`;
        return;
      }
    }

    // 5. If query has code or token_hash and we are on customer home '/'
    if (
      (search.includes("code=") || search.includes("token_hash=")) &&
      pathname === "/"
    ) {
      const searchParams = new URLSearchParams(search);
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      if (code || tokenHash) {
        if (!searchParams.has("next")) {
          if (searchParams.get("type") === "invite") {
            searchParams.set("next", "/admin/accept-invite");
          }
        }
        window.location.href = `/auth/callback?${searchParams.toString()}`;
        return;
      }
    }

    // 6. Reactive session inspection: ensure invited staff is redirected to accept-invite
    const supabase = createClient();
    const checkStaffStatus = (u: any) => {
      if (!u) return;
      const meta = u.user_metadata || {};
      const isStaff = meta.role === "staff" || meta.signup_as === "staff";
      const staffStatus = meta.staff_status || "invited";
      if (isStaff && staffStatus === "invited") {
        if (!window.location.pathname.startsWith("/admin/accept-invite")) {
          window.location.href = "/admin/accept-invite";
        }
      }
    };

    supabase.auth.getUser().then(({ data: { user } }) => checkStaffStatus(user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkStaffStatus(session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
