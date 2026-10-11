import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const as = url.searchParams.get("as");

  // Prevent open redirect: only local paths allowed
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    const errorRedirect = safeNext.startsWith("/admin")
      ? "/admin/login?error=invalid_link"
      : "/login?error=invalid_link";
    return NextResponse.redirect(new URL(errorRedirect, url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorRedirect = safeNext.startsWith("/admin")
      ? "/admin/login?error=link_expired"
      : "/login?error=link_expired";
    return NextResponse.redirect(new URL(errorRedirect, url.origin));
  }

  // If user is resetting password, allow them directly to their reset form
  if (safeNext.includes("reset-password")) {
    return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() || "hajaraswad210299@gmail.com";
    const isConfiguredAdmin = Boolean(user.email?.toLowerCase() === adminEmail);

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
        const { data: createdProfile } = await adminSupabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: googleName,
            avatar_url: googleAvatar,
            role: isConfiguredAdmin ? "admin" : (as === "worker" ? "worker" : "customer"),
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

    if (isConfiguredAdmin || profile?.role === "admin") {
      const target = safeNext.startsWith("/admin") ? safeNext : "/admin";
      return NextResponse.redirect(new URL(target, url.origin));
    }

    if (profile?.role === "worker") {
      return NextResponse.redirect(new URL("/mitra", url.origin));
    }

    // Customer: if phone is missing or onboarding not done, go to welcome page
    if (!profile?.onboarding_completed || !profile?.phone) {
      return NextResponse.redirect(
        new URL(`/welcome?next=${encodeURIComponent(safeNext)}`, url.origin)
      );
    }

    return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
