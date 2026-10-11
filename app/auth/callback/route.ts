import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/admin";

  // Prevent open redirect: only local paths allowed
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  if (!code) {
    return NextResponse.redirect(new URL("/admin/login?error=invalid_link", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/admin/login?error=link_expired", url.origin));
  }

  // If user is resetting password, allow them directly
  if (safeNext === "/admin/reset-password") {
    return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // If this is the configured admin email, allow access
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (adminEmail && user.email?.toLowerCase() === adminEmail) {
      return NextResponse.redirect(new URL(safeNext, url.origin));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/denied", url.origin));
    }
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
