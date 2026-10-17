import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomerOrder, mapDbOrderToOrder } from "@/lib/data/orders";
import { MOCK_ORDERS } from "@/lib/mock/data";
import { Order, OrderStatus } from "@/lib/data/types";
import { getUserPermissions } from "@/lib/supabase/auth";
import { hasPermission } from "@/lib/auth/permissions";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const customerType = searchParams.get("customerType") || undefined;

    const adminSupabase = createAdminClient();

    // Who may see every order: Admin Utama, or active staff with orders.view (A02, A12)
    let canViewAll = false;
    if (user) {
      const { data: prof } = await adminSupabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      const perms = await getUserPermissions(user, prof);
      canViewAll =
        perms.isAdmin ||
        (perms.isStaff &&
          perms.staffStatus === "active" &&
          hasPermission(perms.permissions, "orders.view", false));
    }
    const role = canViewAll ? "admin" : "customer";

    // Query orders from Supabase with joins
    let query = adminSupabase
      .from("orders")
      .select(`
        *,
        customer:profiles!customer_id (id, full_name, phone, avatar_url),
        worker:workers!worker_id (id, full_name, phone, service_area, is_verified, user_id, photo_path),
        package:service_packages!package_id (id, name, inclusions, exclusions, categories(name)),
        photos:order_photos(*),
        events:order_events(*),
        complaints(*)
      `)
      .order("created_at", { ascending: false });

    // Everyone else can ONLY see their own orders
    if (role !== "admin") {
      if (!user) {
        return NextResponse.json({ success: true, orders: [] });
      }
      query = query.eq("customer_id", user.id);
    }

    const { data: dbOrders, error: dbErr } = await query;
    if (dbErr) {
      console.warn("DB orders fetch error:", dbErr);
    }

    // Fetch auth users to map verified customer emails
    let emailMap = new Map<string, string>();
    try {
      const { data: authData } = await adminSupabase.auth.admin.listUsers();
      if (authData?.users) {
        for (const u of authData.users) {
          if (u.email) emailMap.set(u.id, u.email);
        }
      }
    } catch {}

    // Fetch active Plus subscriptions to correctly map is_plus
    const { data: subs } = await adminSupabase
      .from("subscriptions")
      .select("user_id, plan, current_period_end");

    const plusUserSet = new Set(
      (subs || [])
        .filter(
          (s) =>
            s.plan === "plus" &&
            (!s.current_period_end || new Date(s.current_period_end) > new Date())
        )
        .map((s) => s.user_id)
    );

    // Map db orders to Order interface
    const mappedDbOrders: Order[] = (dbOrders || []).map((row) =>
      mapDbOrderToOrder(
        row,
        plusUserSet.has(row.customer_id),
        emailMap.get(row.customer_id)
      )
    );

    // Mock mode only: merge demo orders for admins (real DB orders first)
    let combined: Order[] = [...mappedDbOrders];
    if (role === "admin" && process.env.USE_MOCK_DATA === "true") {
      const existingCodes = new Set(mappedDbOrders.map((o) => o.order_code));
      for (const m of MOCK_ORDERS) {
        if (!existingCodes.has(m.order_code)) {
          combined.push(m);
        }
      }
    }

    // Apply filtering
    if (tab) {
      switch (tab) {
        case "action_needed":
          combined = combined.filter(
            (o) =>
              o.worker_response === "declined" ||
              o.dispatch_status === "exhausted" ||
              o.complaint?.status === "open" ||
              (o.status === "paid" && !o.worker)
          );
          break;
        case "finding_worker":
          combined = combined.filter((o) => o.status === "paid");
          break;
        case "active":
          combined = combined.filter(
            (o) =>
              o.status === "worker_confirmed" ||
              o.status === "on_the_way" ||
              o.status === "in_progress" ||
              o.status === "awaiting_confirmation"
          );
          break;
        case "completed":
          combined = combined.filter((o) => o.status === "completed");
          break;
        case "cancelled":
          combined = combined.filter((o) => o.status === "cancelled");
          break;
        case "complaint":
        case "complaints":
          combined = combined.filter((o) => o.complaint?.status === "open");
          break;
        default:
          break;
      }
    }

    if (search) {
      const q = search.toLowerCase().trim();
      combined = combined.filter(
        (o) =>
          o.order_code.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.worker?.name.toLowerCase().includes(q)
      );
    }

    if (category && category !== "all") {
      combined = combined.filter(
        (o) =>
          o.package.category_name.toLowerCase() === category.toLowerCase()
      );
    }

    if (customerType && customerType !== "all") {
      const isPlusFilter = customerType === "plus";
      combined = combined.filter((o) => o.customer.is_plus === isPlusFilter);
    }

    if (status && status !== "all") {
      combined = combined.filter((o) => o.status === status);
    }

    return NextResponse.json({ success: true, orders: combined });
  } catch (err: any) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Silakan masuk terlebih dahulu untuk membuat pesanan." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      package_id,
      worker_id,
      address,
      scheduled_date,
      time_slot,
      description,
      photo_paths = [],
      allow_reassign = true,
      save_default_address = false,
    } = body;

    if (!package_id || !address || !scheduled_date || !time_slot) {
      return NextResponse.json(
        { error: "Mohon lengkapi seluruh formulir pesanan." },
        { status: 400 }
      );
    }

    // C05 server-side validation
    if (typeof description !== "string" || description.trim().length < 10) {
      return NextResponse.json(
        { error: "Ceritakan masalahnya minimal 10 karakter." },
        { status: 400 }
      );
    }
    if (!isAllowedScheduleDate(String(scheduled_date))) {
      return NextResponse.json(
        { error: "Pilih jadwal antara besok sampai 14 hari ke depan." },
        { status: 400 }
      );
    }
    if (!ALLOWED_SLOT_PREFIXES.some((prefix) => String(time_slot).startsWith(prefix))) {
      return NextResponse.json({ error: "Slot waktu tidak valid." }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Fetch user profile
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("full_name, phone, default_address, onboarding_completed, role")
      .eq("id", user.id)
      .single();

    if (profile?.role && profile.role !== "customer") {
      return NextResponse.json(
        { error: "Hanya akun pelanggan yang dapat membuat pesanan." },
        { status: 403 }
      );
    }
    if (!profile?.phone) {
      return NextResponse.json(
        { error: "Lengkapi nomor WhatsApp kamu terlebih dahulu." },
        { status: 400 }
      );
    }

    // C05: one click on "Bayar" never creates two orders
    const idemKey =
      typeof body.idempotency_key === "string" && body.idempotency_key
        ? `${user.id}:${body.idempotency_key}`
        : null;
    if (idemKey) {
      const previous = recentOrderRequests.get(idemKey);
      if (previous && Date.now() - previous.at < IDEMPOTENCY_TTL_MS) {
        const prevResult = await previous.result;
        if (prevResult.success && prevResult.order) {
          return NextResponse.json({
            success: true,
            order: prevResult.order,
            snap_token: prevResult.snapToken,
          });
        }
      }
    }

    // Check Plus subscription status safely via admin client
    const { data: sub } = await adminSupabase
      .from("subscriptions")
      .select("plan, current_period_end")
      .eq("user_id", user.id)
      .single();

    const isPlus = Boolean(
      sub?.plan === "plus" &&
        sub?.current_period_end &&
        new Date(sub.current_period_end) > new Date()
    );

    // Save default address if requested
    if (save_default_address && address) {
      await adminSupabase
        .from("profiles")
        .update({ default_address: address })
        .eq("id", user.id);
    }

    const resultPromise = createCustomerOrder({
      packageId: package_id,
      workerId: worker_id || null,
      address,
      scheduledDate: scheduled_date,
      timeSlot: time_slot,
      description: description || "Perbaikan rumah",
      photoPaths: photo_paths,
      allowReassign: allow_reassign,
      customerId: user.id,
      customerName:
        profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Pelanggan",
      customerPhone: profile?.phone || user.user_metadata?.phone || "081200000000",
      customerEmail: user.email || "pelanggan@buildmate.id",
      isPlus,
    });
    if (idemKey) {
      recentOrderRequests.set(idemKey, { at: Date.now(), result: resultPromise });
    }
    const result = await resultPromise;
    if (idemKey && !result.success) {
      recentOrderRequests.delete(idemKey);
    }

    if (!result.success || !result.order) {
      return NextResponse.json(
        { error: result.error || "Gagal membuat pesanan." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      order: result.order,
      snap_token: result.snapToken,
    });
  } catch (err: any) {
    console.error("Order creation API error:", err);
    return NextResponse.json(
      { error: err?.message || "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}

const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const recentOrderRequests = new Map<
  string,
  { at: number; result: ReturnType<typeof createCustomerOrder> }
>();

const ALLOWED_SLOT_PREFIXES = ["Pagi", "Siang", "Sore"];

/** C05: scheduled date must be between tomorrow and +14 days (WIB calendar). */
function isAllowedScheduleDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const wibToday = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toDay = (iso: string) => Math.round(new Date(`${iso}T00:00:00Z`).getTime() / 86400000);
  const diff = toDay(value) - toDay(wibToday);
  return diff >= 1 && diff <= 14;
}
