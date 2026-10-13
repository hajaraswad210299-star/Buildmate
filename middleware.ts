import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const OPEN_ADMIN_PATHS = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
  "/admin/denied",
  "/admin/no-access",
  "/admin/accept-invite",
];

const CUSTOMER_PROTECTED_PATHS = [
  "/order",
  "/payment",
  "/orders",
  "/account",
  "/welcome",
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

  // Intercept any confirmation or auth code arriving at non-callback URLs (e.g. '/' or '/admin')
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if ((code || tokenHash) && pathname !== "/auth/callback") {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    if (!callbackUrl.searchParams.has("next")) {
      if (type === "invite") {
        callbackUrl.searchParams.set("next", "/admin/accept-invite");
      } else if (type === "email_change" || pathname.startsWith("/admin")) {
        callbackUrl.searchParams.set("next", "/admin/settings?verified=email");
      } else {
        callbackUrl.searchParams.set("next", "/admin/settings");
      }
    }
    return NextResponse.redirect(callbackUrl);
  }

  // 1. ADMIN ROUTES
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const configuredAdmins = [
          (process.env.ADMIN_EMAIL || "").toLowerCase(),
          (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase(),
          "jonathanhuang88@proton.me",
          "hajaraswad210299@gmail.com",
        ].filter(Boolean);
        const isConfiguredAdmin = Boolean(user.email && configuredAdmins.includes(user.email.toLowerCase()));

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
          .select("role, staff_status")
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

        if (profile?.role === "staff") {
          const status = profile.staff_status || "invited";
          if (status === "invited") {
            const acceptUrl = request.nextUrl.clone();
            acceptUrl.pathname = "/admin/accept-invite";
            return NextResponse.redirect(acceptUrl);
          }
          if (status === "disabled") {
            const deniedUrl = request.nextUrl.clone();
            deniedUrl.pathname = "/admin/denied";
            return NextResponse.redirect(deniedUrl);
          }
          const dashboardUrl = request.nextUrl.clone();
          dashboardUrl.pathname = "/admin";
          dashboardUrl.search = "";
          return NextResponse.redirect(dashboardUrl);
        }
      }

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

    const configuredAdmins = [
      (process.env.ADMIN_EMAIL || "").toLowerCase(),
      (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase(),
      "jonathanhuang88@proton.me",
      "hajaraswad210299@gmail.com",
    ].filter(Boolean);
    const isConfiguredAdmin = Boolean(user.email && configuredAdmins.includes(user.email.toLowerCase()));

    if (!isConfiguredAdmin) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, staff_status")
        .eq("id", user.id)
        .single();

      if (!profile) {
        const deniedUrl = request.nextUrl.clone();
        deniedUrl.pathname = "/admin/denied";
        const redirectRes = NextResponse.redirect(deniedUrl);
        redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
        return redirectRes;
      }

      if (profile.role === "staff") {
        const status = profile.staff_status || "invited";
        if (status === "invited" && pathname !== "/admin/accept-invite") {
          const acceptUrl = request.nextUrl.clone();
          acceptUrl.pathname = "/admin/accept-invite";
          return NextResponse.redirect(acceptUrl);
        }
        if (status === "disabled") {
          const deniedUrl = request.nextUrl.clone();
          deniedUrl.pathname = "/admin/denied";
          return NextResponse.redirect(deniedUrl);
        }
      } else if (profile.role !== "admin") {
        const deniedUrl = request.nextUrl.clone();
        deniedUrl.pathname = "/admin/denied";
        const redirectRes = NextResponse.redirect(deniedUrl);
        redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
        return redirectRes;
      }
    }

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  }

  // 2. CUSTOMER AUTH PAGES (/login, /register)
  if (pathname === "/login" || pathname === "/register") {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_completed, phone")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      if (profile?.role === "worker") {
        return NextResponse.redirect(new URL("/mitra", request.url));
      }

      // Customer
      const nextParam = request.nextUrl.searchParams.get("next");
      const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

      if (!profile?.onboarding_completed || !profile?.phone) {
        return NextResponse.redirect(new URL(`/welcome?next=${encodeURIComponent(safeNext)}`, request.url));
      }

      return NextResponse.redirect(new URL(safeNext, request.url));
    }

    return response;
  }

  // 3. CUSTOMER PROTECTED PATHS
  const isProtectedCustomer = CUSTOMER_PROTECTED_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtectedCustomer) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname + (request.nextUrl.search || ""));
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_completed, phone")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (profile?.role === "worker") {
      return NextResponse.redirect(new URL("/mitra", request.url));
    }

    // Require onboarding before accessing checkout or payment
    if (pathname.startsWith("/order") || pathname.startsWith("/payment")) {
      if (!profile?.onboarding_completed || !profile?.phone) {
        const welcomeUrl = request.nextUrl.clone();
        welcomeUrl.pathname = "/welcome";
        welcomeUrl.searchParams.set("next", pathname + (request.nextUrl.search || ""));
        return NextResponse.redirect(welcomeUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/auth/callback",
    "/auth/confirm",
    "/order/:path*",
    "/payment/:path*",
    "/orders/:path*",
    "/account/:path*",
    "/welcome",
    "/login",
    "/register",
  ],
};
