import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeNext } from "@/lib/auth/safe-redirect";

const OPEN_ADMIN_PATHS = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
  "/admin/denied",
  "/admin/no-access",
  "/admin/accept-invite",
];

const OPEN_MITRA_PATHS = [
  "/mitra/login",
  "/mitra/register",
  "/mitra/verify-email",
  "/mitra/forgot-password",
  "/mitra/reset-password",
];

const CUSTOMER_PROTECTED_PATHS = [
  "/order",
  "/payment",
  "/orders",
  "/account",
  "/welcome",
];

type AdminAccess = "admin" | "staff_active" | "staff_invited" | "staff_disabled" | "none";

async function getAdminAccess(userId: string): Promise<AdminAccess> {
  const { data: profile, error } = await createAdminClient()
    .from("profiles")
    .select("role, staff_status")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile) return "none";
  if (profile.role === "admin") return "admin";
  if (profile.role === "staff") {
    if (profile.staff_status === "active") return "staff_active";
    if (profile.staff_status === "disabled") return "staff_disabled";
    return "staff_invited";
  }
  return "none";
}

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
      if (
        type === "invite" ||
        pathname.startsWith("/admin/accept-invite") ||
        request.nextUrl.search.includes("accept-invite")
      ) {
        callbackUrl.searchParams.set("next", "/admin/accept-invite");
      } else if (type === "email_change" || pathname.startsWith("/admin")) {
        callbackUrl.searchParams.set("next", "/admin/settings?verified=email");
      }
    }
    return NextResponse.redirect(callbackUrl);
  }

  // 1. ADMIN ROUTES (akses ditentukan HANYA dari tabel profiles)
  if (pathname.startsWith("/admin")) {
    const noStore = (res: NextResponse) => {
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.headers.set("Pragma", "no-cache");
      res.headers.set("Expires", "0");
      return res;
    };
    const redirectTo = (path: string, withNext = false) => {
      const url = request.nextUrl.clone();
      url.pathname = path;
      url.search = "";
      if (withNext) url.searchParams.set("next", pathname);
      return noStore(NextResponse.redirect(url));
    };

    const isOpen = OPEN_ADMIN_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (isOpen) return noStore(response);
      return redirectTo("/admin/login", true);
    }

    const access = await getAdminAccess(user.id);

    if (pathname === "/admin/login") {
      if (access === "admin" || access === "staff_active") return redirectTo("/admin");
      if (access === "staff_invited") return redirectTo("/admin/accept-invite");
      if (access === "staff_disabled") return redirectTo("/admin/denied");
      return noStore(response);
    }

    if (isOpen) return noStore(response);

    if (access === "admin" || access === "staff_active") return noStore(response);
    if (access === "staff_invited") return redirectTo("/admin/accept-invite");
    return redirectTo("/admin/denied");
  }

  // 2. MITRA / WORKER ROUTES (A3, A4, B11.8, B11.9)
  if (pathname.startsWith("/mitra")) {
    const isOpenMitra = OPEN_MITRA_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isOpenMitra) {
      if (user) {
        const { data: profile } = await createAdminClient()
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role === "admin") {
          return NextResponse.redirect(new URL("/admin", request.url));
        }

        if (profile?.role === "worker") {
          const { data: worker } = await createAdminClient()
            .from("workers")
            .select("application_status")
            .eq("user_id", user.id)
            .maybeSingle();

          const appStatus = worker?.application_status || "draft";
          if (appStatus === "draft" || appStatus === "rejected") {
            return NextResponse.redirect(new URL("/mitra/daftar", request.url));
          }
          if (appStatus === "pending") {
            return NextResponse.redirect(new URL("/mitra/status", request.url));
          }
          if (appStatus === "approved") {
            return NextResponse.redirect(new URL("/mitra", request.url));
          }
        }
      }

      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      return response;
    }

    // Protected Mitra routes
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/mitra/login";
      loginUrl.searchParams.set("next", pathname + (request.nextUrl.search || ""));
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await createAdminClient()
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (profile?.role === "customer") {
      return NextResponse.redirect(new URL("/mitra/login?error=email_is_customer", request.url));
    }

    // Role is worker: enforce application status gates (A4, B11.8)
    const { data: worker } = await createAdminClient()
      .from("workers")
      .select("application_status")
      .eq("user_id", user.id)
      .maybeSingle();

    const appStatus = worker?.application_status || "draft";

    if (appStatus === "draft" || appStatus === "rejected") {
      if (pathname !== "/mitra/daftar") {
        return NextResponse.redirect(new URL("/mitra/daftar", request.url));
      }
    } else if (appStatus === "pending") {
      if (pathname !== "/mitra/status") {
        return NextResponse.redirect(new URL("/mitra/status", request.url));
      }
    } else if (appStatus === "approved") {
      if (pathname === "/mitra/daftar" || pathname === "/mitra/status") {
        return NextResponse.redirect(new URL("/mitra", request.url));
      }
    }

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    return response;
  }

  // 3. CUSTOMER AUTH PAGES (/login, /register)
  if (pathname === "/login" || pathname === "/register") {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await createAdminClient()
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
      const candidate = safeNext(request.nextUrl.searchParams.get("next"), "/");
      const safeNextValue =
        candidate.startsWith("/admin") || candidate.startsWith("/mitra") ? "/" : candidate;

      if (!profile?.onboarding_completed || !profile?.phone) {
        return NextResponse.redirect(new URL(`/welcome?next=${encodeURIComponent(safeNextValue)}`, request.url));
      }

      return NextResponse.redirect(new URL(safeNextValue, request.url));
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

    const { data: profile } = await createAdminClient()
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
    "/mitra/:path*",
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
