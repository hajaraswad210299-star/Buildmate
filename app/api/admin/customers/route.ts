import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CustomerItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string | null;
  is_plus: boolean;
  plus_expires_at?: string;
  order_count: number;
  total_spent: number;
  created_at: string;
  is_real: boolean;
}

const deletedMockIds = new Set<string>();

const MOCK_CUSTOMERS: CustomerItem[] = [
  {
    id: "cust-mock-1",
    name: "Siti Rahmawati",
    email: "siti.rahma@gmail.com",
    phone: "628119876543",
    avatar_url: null,
    is_plus: true,
    plus_expires_at: "2026-11-04T10:00:00Z",
    order_count: 5,
    total_spent: 850000,
    created_at: "2026-08-12T09:00:00Z",
    is_real: false,
  },
  {
    id: "cust-mock-2",
    name: "Dimas Anggara",
    email: "dimas.anggara@gmail.com",
    phone: "628128889991",
    avatar_url: null,
    is_plus: false,
    order_count: 2,
    total_spent: 505000,
    created_at: "2026-09-01T14:20:00Z",
    is_real: false,
  },
  {
    id: "cust-mock-3",
    name: "Kartika Putri",
    email: "kartika.p@gmail.com",
    phone: "628571234888",
    avatar_url: null,
    is_plus: false,
    order_count: 1,
    total_spent: 205000,
    created_at: "2026-10-09T10:00:00Z",
    is_real: false,
  },
  {
    id: "cust-mock-4",
    name: "Hendra Wijaya",
    email: "hendra.w@gmail.com",
    phone: "628123344556",
    avatar_url: null,
    is_plus: true,
    plus_expires_at: "2026-10-28T08:00:00Z",
    order_count: 3,
    total_spent: 420000,
    created_at: "2026-09-15T11:00:00Z",
    is_real: false,
  },
];

async function checkAdminAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminEmail = (process.env.ADMIN_EMAIL || "hajaraswad210299@gmail.com").toLowerCase();
  if (user.email?.toLowerCase() === adminEmail) {
    return user;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    return user;
  }

  return null;
}

export async function GET() {
  try {
    const adminUser = await checkAdminAuth();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // 1. Fetch all auth users to retrieve verified email addresses
    let usersList: any[] = [];
    try {
      const { data: authData } = await adminSupabase.auth.admin.listUsers();
      if (authData?.users) {
        usersList = authData.users;
      }
    } catch (err) {
      console.warn("Failed to list auth users:", err);
    }

    const authMap = new Map<string, any>();
    for (const u of usersList) {
      authMap.set(u.id, u);
    }

    // 2. Fetch all profiles
    let profilesList: any[] = [];
    try {
      const { data: profData } = await adminSupabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (profData) {
        profilesList = profData;
      }
    } catch (err) {
      console.warn("Failed to fetch profiles:", err);
    }

    // 3. Fetch subscriptions
    const subMap = new Map<string, any>();
    try {
      const { data: subs } = await adminSupabase.from("subscriptions").select("*");
      if (subs) {
        for (const s of subs) {
          subMap.set(s.user_id, s);
        }
      }
    } catch {}

    // 4. Fetch orders for stats aggregation
    const orderStatsMap = new Map<string, { count: number; totalSpent: number }>();
    try {
      const { data: orders } = await adminSupabase
        .from("orders")
        .select("id, customer_id, total_price, status");
      if (orders) {
        for (const o of orders) {
          const curr = orderStatsMap.get(o.customer_id) || { count: 0, totalSpent: 0 };
          curr.count += 1;
          if (
            ["completed", "paid", "worker_confirmed", "on_the_way", "in_progress"].includes(
              o.status
            )
          ) {
            curr.totalSpent += Number(o.total_price) || 0;
          }
          orderStatsMap.set(o.customer_id, curr);
        }
      }
    } catch {}

    // Build real customer items
    const realCustomers: CustomerItem[] = [];
    const processedIds = new Set<string>();

    for (const p of profilesList) {
      if (p.role === "admin" || p.role === "worker") continue;

      const authUser = authMap.get(p.id);
      const sub = subMap.get(p.id);
      const stats = orderStatsMap.get(p.id) || { count: 0, totalSpent: 0 };

      const isPlus =
        sub?.plan === "plus" &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

      const email =
        authUser?.email ||
        authUser?.user_metadata?.email ||
        p.email ||
        "-";

      realCustomers.push({
        id: p.id,
        name:
          p.full_name ||
          authUser?.user_metadata?.full_name ||
          authUser?.user_metadata?.name ||
          email.split("@")[0] ||
          "Pelanggan Baru",
        email,
        phone: p.phone || authUser?.phone || authUser?.user_metadata?.phone || "-",
        avatar_url:
          p.avatar_url ||
          authUser?.user_metadata?.avatar_url ||
          authUser?.user_metadata?.picture ||
          null,
        is_plus: Boolean(isPlus),
        plus_expires_at: sub?.current_period_end || undefined,
        order_count: stats.count,
        total_spent: stats.totalSpent,
        created_at: p.created_at || authUser?.created_at || new Date().toISOString(),
        is_real: true,
      });
      processedIds.add(p.id);
    }

    // Check if there are any auth users with role customer who don't have a profile yet
    for (const u of usersList) {
      if (processedIds.has(u.id)) continue;
      const adminEmail = (process.env.ADMIN_EMAIL || "hajaraswad210299@gmail.com").toLowerCase();
      if (u.email?.toLowerCase() === adminEmail) continue;
      if (u.user_metadata?.role === "admin" || u.user_metadata?.signup_as === "worker") continue;

      const sub = subMap.get(u.id);
      const stats = orderStatsMap.get(u.id) || { count: 0, totalSpent: 0 };
      const isPlus =
        sub?.plan === "plus" &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

      realCustomers.push({
        id: u.id,
        name:
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          u.email?.split("@")[0] ||
          "Pelanggan Baru",
        email: u.email || "-",
        phone: u.phone || u.user_metadata?.phone || "-",
        avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
        is_plus: Boolean(isPlus),
        plus_expires_at: sub?.current_period_end || undefined,
        order_count: stats.count,
        total_spent: stats.totalSpent,
        created_at: u.created_at || new Date().toISOString(),
        is_real: true,
      });
      processedIds.add(u.id);
    }

    // Combine with mock customers if mock is enabled
    const availableMockCustomers = MOCK_CUSTOMERS.filter((c) => !deletedMockIds.has(c.id));
    const useMock = process.env.USE_MOCK_DATA === "true";
    const allCustomers = useMock
      ? [...realCustomers, ...availableMockCustomers]
      : realCustomers.length > 0
      ? realCustomers
      : availableMockCustomers;

    return NextResponse.json({
      success: true,
      customers: allCustomers,
      real_count: realCustomers.length,
      total_count: allCustomers.length,
    });
  } catch (err: any) {
    console.error("GET /api/admin/customers error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUser = await checkAdminAuth();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, action, days = 30 } = body;

    if (!customerId || !action) {
      return NextResponse.json(
        { error: "customerId and action are required" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    if (action === "grant_plus") {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(days));

      const { error } = await adminSupabase.from("subscriptions").upsert({
        user_id: customerId,
        plan: "plus",
        current_period_end: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Status BuildMate Plus aktif hingga ${expiresAt.toLocaleDateString("id-ID")}`,
        expires_at: expiresAt.toISOString(),
      });
    }

    if (action === "revoke_plus") {
      const { error } = await adminSupabase.from("subscriptions").upsert({
        user_id: customerId,
        plan: "free",
        current_period_end: null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "Status BuildMate Plus dinonaktifkan (kembali ke Reguler)",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/admin/customers error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUser = await checkAdminAuth();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID pelanggan wajib disertakan" }, { status: 400 });
    }

    if (id === adminUser.id) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus akun admin yang sedang login" },
        { status: 400 }
      );
    }

    // Jika ini ID akun simulasi mock
    if (id.startsWith("cust-mock-")) {
      deletedMockIds.add(id);
      return NextResponse.json({
        success: true,
        message: "Akun simulasi berhasil dihapus",
      });
    }

    const adminSupabase = createAdminClient();

    // Safety check: Cegah penghapusan email Super Admin
    const adminEmail = (process.env.ADMIN_EMAIL || "hajaraswad210299@gmail.com").toLowerCase();
    try {
      const { data: targetAuthUser } = await adminSupabase.auth.admin.getUserById(id);
      if (targetAuthUser?.user?.email?.toLowerCase() === adminEmail) {
        return NextResponse.json(
          { error: "Tidak dapat menghapus akun Super Admin" },
          { status: 400 }
        );
      }
    } catch {
      // Abaikan jika user tidak ada di auth
    }

    // 1. Hapus subscriptions
    try {
      await adminSupabase.from("subscriptions").delete().eq("user_id", id);
    } catch (e) {
      console.warn("Delete subscriptions error:", e);
    }

    // 2. Hapus payments
    try {
      await adminSupabase.from("payments").delete().eq("customer_id", id);
    } catch (e) {
      console.warn("Delete payments error:", e);
    }

    // 3. Hapus orders (akan cascade ke order_photos, order_events, complaints, payouts)
    try {
      await adminSupabase.from("orders").delete().eq("customer_id", id);
    } catch (e) {
      console.warn("Delete orders error:", e);
    }

    // 4. Hapus workers jika akun pernah mendaftar sebagai mitra
    try {
      await adminSupabase.from("workers").delete().eq("user_id", id);
    } catch (e) {
      console.warn("Delete workers error:", e);
    }

    // 5. Hapus profiles
    try {
      await adminSupabase.from("profiles").delete().eq("id", id);
    } catch (e) {
      console.warn("Delete profile error:", e);
    }

    // 6. Hapus akun di auth.users Supabase
    // Ini langkah krusial: menghapus kredensial di auth.users membebaskan email tersebut
    // sehingga pengguna dapat mendaftar kembali secara mandiri (via Google atau form pendaftaran biasa)
    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(id);
    if (authDeleteError) {
      console.warn("adminSupabase.auth.admin.deleteUser warning:", authDeleteError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Akun pelanggan berhasil dihapus secara permanen. Pengguna dapat mendaftar kembali secara mandiri.",
    });
  } catch (err: any) {
    console.error("DELETE /api/admin/customers error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
