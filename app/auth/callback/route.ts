import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/";
  const as = url.searchParams.get("as");
  const error = url.searchParams.get("error");

  // Prevent open redirect: only local paths allowed
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (error) {
    const errorRedirect = safeNext.startsWith("/admin")
      ? `/admin/login?error=${encodeURIComponent(error)}`
      : `/login?error=${encodeURIComponent(error)}`;
    return NextResponse.redirect(new URL(errorRedirect, url.origin));
  }

  const supabase = await createClient();

  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });
    if (verifyError) {
      console.error("verifyOtp error:", verifyError);
      const errorRedirect = safeNext.startsWith("/admin")
        ? "/admin/login?error=link_expired"
        : "/login?error=link_expired";
      return NextResponse.redirect(new URL(errorRedirect, url.origin));
    }
  } else if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error("exchangeCodeForSession error:", exchangeError);
      const errorRedirect = safeNext.startsWith("/admin")
        ? "/admin/login?error=link_expired"
        : "/login?error=link_expired";
      return NextResponse.redirect(new URL(errorRedirect, url.origin));
    }
  } else {
    const errorRedirect = safeNext.startsWith("/admin")
      ? "/admin/login?error=invalid_link"
      : "/login?error=invalid_link";
    return NextResponse.redirect(new URL(errorRedirect, url.origin));
  }

  // If user is resetting password, allow them directly to their reset form
  if (safeNext.includes("reset-password")) {
    return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  // If user is accepting staff invite, route directly to accept-invite form
  if (safeNext.includes("accept-invite") || type === "invite") {
    return NextResponse.redirect(new URL("/admin/accept-invite", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const meta = user.user_metadata || {};
    const isStaff = meta.role === "staff" || meta.signup_as === "staff";
    const staffStatus = meta.staff_status || "invited";

    // Immediate check for staff: must go to accept-invite if invited
    if (isStaff) {
      if (staffStatus === "invited") {
        return NextResponse.redirect(new URL("/admin/accept-invite", url.origin));
      }
      if (staffStatus === "disabled") {
        return NextResponse.redirect(new URL("/admin/denied", url.origin));
      }
      const target =
        safeNext.startsWith("/admin") && safeNext !== "/admin/accept-invite"
          ? safeNext
          : "/admin";
      return NextResponse.redirect(new URL(target, url.origin));
    }

    const configuredAdmins = [
      (process.env.ADMIN_EMAIL || "").toLowerCase(),
      (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase(),
      "jonathanhuang88@proton.me",
    ].filter((e) => Boolean(e) && e !== "hajaraswad210299@gmail.com");
    const isConfiguredAdmin = Boolean(user.email && configuredAdmins.includes(user.email.toLowerCase()));

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
        const isStaffInvite =
          user.user_metadata?.signup_as === "staff" ||
          user.user_metadata?.role === "staff" ||
          type === "invite" ||
          safeNext.includes("accept-invite");

        const targetRole = isConfiguredAdmin
          ? "admin"
          : isStaffInvite
          ? "staff"
          : as === "worker"
          ? "worker"
          : "customer";

        const { data: createdProfile } = await adminSupabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: googleName,
            avatar_url: googleAvatar,
            role: targetRole === "staff" ? "customer" : targetRole,
            onboarding_completed: false,
          })
          .select()
          .single();

        profile = createdProfile;
        if (!isStaffInvite && targetRole !== "admin") {
          await adminSupabase.from("subscriptions").insert({ user_id: user.id }).select();
        }
      } else {
        profile = existingProfile;
        // If configured admin, guarantee profile role is admin
        if (isConfiguredAdmin && existingProfile.role !== "admin") {
          const { data: updatedProfile } = await adminSupabase
            .from("profiles")
            .update({ role: "admin" })
            .eq("id", user.id)
            .select()
            .single();
          if (updatedProfile) profile = updatedProfile;
        }
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
    if (isConfiguredAdmin || profile?.role === "admin" || type === "email_change") {
      let target = safeNext.startsWith("/admin") ? safeNext : "/admin/settings";
      if (type === "email_change") {
        target = "/admin/settings?verified=email";
      } else if (target.startsWith("/admin/settings") && !target.includes("verified=")) {
        target = "/admin/settings?verified=email";
      }
      return NextResponse.redirect(new URL(target, url.origin));
    }

    // Handle Staff (Direct to accept-invite if invited, or /admin if active)
    if (
      profile?.role === "staff" ||
      user.user_metadata?.role === "staff" ||
      user.user_metadata?.signup_as === "staff"
    ) {
      const status = profile?.staff_status || user.user_metadata?.staff_status || "invited";
      if (status === "invited") {
        return NextResponse.redirect(new URL("/admin/accept-invite", url.origin));
      }
      if (status === "disabled") {
        return NextResponse.redirect(new URL("/admin/denied", url.origin));
      }
      const target =
        safeNext.startsWith("/admin") && safeNext !== "/admin/accept-invite"
          ? safeNext
          : "/admin";
      return NextResponse.redirect(new URL(target, url.origin));
    }

    if (as === "worker" && profile?.role === "customer") {
      return NextResponse.redirect(new URL("/mitra/login?error=email_is_customer", url.origin));
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
        return NextResponse.redirect(new URL("/mitra/daftar", url.origin));
      }
      if (status === "pending") {
        return NextResponse.redirect(new URL("/mitra/status", url.origin));
      }
      const target =
        safeNext.startsWith("/mitra") &&
        safeNext !== "/mitra/daftar" &&
        safeNext !== "/mitra/status" &&
        !safeNext.startsWith("/mitra/login")
          ? safeNext
          : "/mitra";
      return NextResponse.redirect(new URL(target, url.origin));
    }

    // Customer: if phone is missing or onboarding not done, go to welcome page
    const customerNext =
      safeNext &&
      !safeNext.startsWith("/admin") &&
      !safeNext.startsWith("/mitra")
        ? safeNext
        : "/";

    if (!profile?.onboarding_completed || !profile?.phone) {
      return NextResponse.redirect(
        new URL(`/welcome?next=${encodeURIComponent(customerNext)}`, url.origin)
      );
    }

    return NextResponse.redirect(new URL(customerNext, url.origin));
  }

  return NextResponse.redirect(new URL("/", url.origin));
}
