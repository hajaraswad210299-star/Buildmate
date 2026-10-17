import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/";
  const as = url.searchParams.get("as");
  const error = url.searchParams.get("error");

  const baseOrigin = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
    : url.origin;

  // Prevent open redirect: only local paths allowed
  const safeNextPath = safeNext(next, "/");

  if (error) {
    const errorRedirect = safeNextPath.startsWith("/admin")
      ? `/admin/login?error=${encodeURIComponent(error)}`
      : safeNextPath.startsWith("/mitra")
      ? `/mitra/login?error=${encodeURIComponent(error)}`
      : `/login?error=${encodeURIComponent(error)}`;
    return NextResponse.redirect(new URL(errorRedirect, baseOrigin));
  }

  const supabase = await createClient();

  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });
    if (verifyError) {
      console.error("verifyOtp error:", verifyError);
      const errorRedirect = safeNextPath.startsWith("/admin")
        ? "/admin/login?error=link_expired"
        : safeNextPath.startsWith("/mitra")
        ? "/mitra/login?error=link_expired"
        : "/login?error=link_expired";
      return NextResponse.redirect(new URL(errorRedirect, baseOrigin));
    }
  } else if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error("exchangeCodeForSession error:", exchangeError);
      const errorRedirect = safeNextPath.startsWith("/admin")
        ? "/admin/login?error=link_expired"
        : safeNextPath.startsWith("/mitra")
        ? "/mitra/login?error=link_expired"
        : "/login?error=link_expired";
      return NextResponse.redirect(new URL(errorRedirect, baseOrigin));
    }
  } else {
    const errorRedirect = safeNextPath.startsWith("/admin")
      ? "/admin/login?error=invalid_link"
      : safeNextPath.startsWith("/mitra")
      ? "/mitra/login?error=invalid_link"
      : "/login?error=invalid_link";
    return NextResponse.redirect(new URL(errorRedirect, baseOrigin));
  }

  // If user is resetting password, allow them directly to their reset form
  if (safeNextPath.includes("reset-password")) {
    return NextResponse.redirect(new URL(safeNextPath, baseOrigin));
  }

  // If user is accepting staff invite, route directly to accept-invite form
  if (safeNextPath.includes("accept-invite") || type === "invite") {
    return NextResponse.redirect(new URL("/admin/accept-invite", baseOrigin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    let profile: any = null;

    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminSupabase = createAdminClient();

      const googleAvatar =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null;
      const googleName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Pengguna Baru";

      const { data: existingProfile } = await adminSupabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!existingProfile) {
        const targetRole = as === "worker" ? "worker" : "customer";

        const { data: createdProfile } = await adminSupabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: googleName,
            avatar_url: googleAvatar,
            role: targetRole,
            onboarding_completed: false,
          })
          .select()
          .single();

        profile = createdProfile;
        await adminSupabase.from("subscriptions").insert({ user_id: user.id }).select();
      } else {
        profile = existingProfile;
        // Sync avatar if existing is empty
        if (!existingProfile.avatar_url && googleAvatar) {
          const { data: updatedProfile } = await adminSupabase
            .from("profiles")
            .update({ avatar_url: googleAvatar })
            .eq("id", user.id)
            .select()
            .single();
          if (updatedProfile) profile = updatedProfile;
        }
      }
    } catch (profileSyncErr) {
      console.error("Profile sync in callback error:", profileSyncErr);
      const { data: fallbackProf } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      profile = fallbackProf;
    }

    // Handle Admin or Email Change
    if (profile?.role === "admin" || type === "email_change") {
      let target = safeNextPath.startsWith("/admin") ? safeNextPath : "/admin/settings";
      if (type === "email_change") {
        target = "/admin/settings?verified=email";
      } else if (target.startsWith("/admin/settings") && !target.includes("verified=")) {
        target = "/admin/settings?verified=email";
      }
      return NextResponse.redirect(new URL(target, baseOrigin));
    }

    // Handle Staff (Direct to accept-invite if invited, or /admin if active)
    if (profile?.role === "staff") {
      const status = profile?.staff_status || "invited";
      if (status === "invited") {
        return NextResponse.redirect(new URL("/admin/accept-invite", baseOrigin));
      }
      if (status === "disabled") {
        return NextResponse.redirect(new URL("/admin/denied", baseOrigin));
      }
      const target =
        safeNextPath.startsWith("/admin") && safeNextPath !== "/admin/accept-invite"
          ? safeNextPath
          : "/admin";
      return NextResponse.redirect(new URL(target, baseOrigin));
    }

    if (as === "worker" && profile?.role === "customer") {
      return NextResponse.redirect(new URL("/mitra/login?error=email_is_customer", baseOrigin));
    }

    if (profile?.role === "worker") {
      let status = "draft";
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminSupabase = createAdminClient();
        const { data: worker } = await adminSupabase
          .from("workers")
          .select("application_status")
          .eq("user_id", user.id)
          .maybeSingle();
        if (worker?.application_status) {
          status = worker.application_status;
        }
      } catch (err) {
        console.warn("Error checking worker status in callback:", err);
      }

      if (status === "draft" || status === "rejected") {
        return NextResponse.redirect(new URL("/mitra/daftar", baseOrigin));
      }
      if (status === "pending") {
        return NextResponse.redirect(new URL("/mitra/status", baseOrigin));
      }
      const target =
        safeNextPath.startsWith("/mitra") &&
        safeNextPath !== "/mitra/daftar" &&
        safeNextPath !== "/mitra/status" &&
        !safeNextPath.startsWith("/mitra/login")
          ? safeNextPath
          : "/mitra";
      return NextResponse.redirect(new URL(target, baseOrigin));
    }

    // Customer: if phone is missing or onboarding not done, go to welcome page
    const customerNext =
      safeNextPath &&
      !safeNextPath.startsWith("/admin") &&
      !safeNextPath.startsWith("/mitra")
        ? safeNextPath
        : "/";

    if (!profile?.onboarding_completed || !profile?.phone) {
      return NextResponse.redirect(
        new URL(`/welcome?next=${encodeURIComponent(customerNext)}`, baseOrigin)
      );
    }

    return NextResponse.redirect(new URL(customerNext, baseOrigin));
  }

  return NextResponse.redirect(new URL("/", baseOrigin));
}
