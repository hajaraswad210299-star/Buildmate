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

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (isConfiguredAdmin || profile?.role === "admin") {
      const target = safeNext.startsWith("/admin") ? safeNext : "/admin";
      return NextResponse.redirect(new URL(target, url.origin));
    }

    if (profile?.role === "worker") {
      return NextResponse.redirect(new URL("/mitra", url.origin));
    }

    // Customer
    if (!profile?.onboarding_completed || !profile?.phone) {
      return NextResponse.redirect(
        new URL(`/welcome?next=${encodeURIComponent(safeNext)}`, url.origin)
      );
    }

    return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
