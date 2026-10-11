import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const OPEN_ADMIN_PATHS = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
  "/admin/denied",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/admin")) {
    // 1. If trying to visit /admin/login while already logged in as admin, lock them to /admin
    if (pathname === "/admin/login") {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() || "hajaraswad210299@gmail.com";
        const isConfiguredAdmin = Boolean(user.email?.toLowerCase() === adminEmail);

        if (isConfiguredAdmin) {
          const dashboardUrl = request.nextUrl.clone();
          dashboardUrl.pathname = "/admin";
          dashboardUrl.search = "";
          const redirectRes = NextResponse.redirect(dashboardUrl);
          redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
          return redirectRes;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role === "admin") {
          const dashboardUrl = request.nextUrl.clone();
          dashboardUrl.pathname = "/admin";
          dashboardUrl.search = "";
          const redirectRes = NextResponse.redirect(dashboardUrl);
          redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
          return redirectRes;
        }
      }

      // If not logged in, allow /admin/login with no-store
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      return response;
    }

    const isOpen = OPEN_ADMIN_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

    if (isOpen) {
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      return response;
    }

    // Refresh and check session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("next", pathname);
      const redirectRes = NextResponse.redirect(loginUrl);
      redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      redirectRes.headers.set("Pragma", "no-cache");
      redirectRes.headers.set("Expires", "0");
      return redirectRes;
    }

    // Check if user is configured ADMIN_EMAIL
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() || "hajaraswad210299@gmail.com";
    const isConfiguredAdmin = Boolean(user.email?.toLowerCase() === adminEmail);

    if (!isConfiguredAdmin) {
      // Check profiles.role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        const deniedUrl = request.nextUrl.clone();
        deniedUrl.pathname = "/admin/denied";
        const redirectRes = NextResponse.redirect(deniedUrl);
        redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
        return redirectRes;
      }
    }

    // Add strict anti-caching headers to all admin pages to prevent back-forward cache leakage
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/auth/callback",
  ],
};
