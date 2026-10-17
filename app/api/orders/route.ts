import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomerOrder, mapDbOrderToOrder } from "@/lib/data/orders";
import { MOCK_ORDERS } from "@/lib/mock/data";
import { Order, OrderStatus } from "@/lib/data/types";
import { isPlusActive } from "@/lib/subscriptions/is-plus-active";
import { getUserPermissions } from "@/lib/supabase/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { isValidScheduledDate } from "@/lib/date/wib";

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

    // Tentukan apakah boleh melihat SEMUA pesanan (admin, atau staf aktif dengan izin orders.view)
    let canViewAll = false;
    if (user) {
      const { data: prof } = await adminSupabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      const perms = await getUserPermissions(user, prof);
      canViewAll =
        perms.isAdmin ||
        (perms.isStaff && perms.staffStatus === "active" && hasPermission(perms.permissions, "orders.view", false));
    }

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

    // Non-admin users can ONLY see their own orders
    if (!canViewAll) {
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
        .filter((s) => isPlusActive(s))
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

    // If admin, merge with mock orders (putting real DB orders first)
    let combined: Order[] = [...mappedDbOrders];
    if (canViewAll) {
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
          combined = combined.filter((o) => !!o.complaint);
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

    if (!isValidScheduledDate(scheduled_date)) {
      return NextResponse.json(
        { error: "Tanggal jadwal tidak valid. Pilih tanggal mulai besok hingga 14 hari ke depan." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Fetch user profile
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("full_name, phone, default_address, onboarding_completed, role")
      .eq("id", user.id)
      .single();

    // Check Plus subscription status safely via admin client
    const { data: sub } = await adminSupabase
      .from("subscriptions")
      .select("plan, current_period_end")
      .eq("user_id", user.id)
      .single();

    const isPlus = isPlusActive(sub);

    // Save default address if requested
    if (save_default_address && address) {
      await adminSupabase
        .from("profiles")
        .update({ default_address: address })
        .eq("id", user.id);
    }

    const result = await createCustomerOrder({
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
