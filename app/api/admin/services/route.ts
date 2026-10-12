import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  saveCategory,
  savePackage,
  deleteCategory,
  deletePackage,
  getCategories,
  getPackages,
} from "@/lib/data/services";

async function checkAdminAuth() {
  try {
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
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const categories = await getCategories();
    const packages = await getPackages();

    return NextResponse.json({
      success: true,
      categories,
      packages,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await checkAdminAuth();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: "type and data are required" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    if (type === "category") {
      const saved = await saveCategory(data);

      // Persist to Supabase if database accessible
      try {
        await adminSupabase.from("categories").upsert({
          name: saved.name,
          slug: saved.slug,
          icon: saved.icon,
          is_active: saved.is_active,
          order_index: saved.order_index,
        }, { onConflict: "slug" });
      } catch (dbErr) {
        console.warn("Category db upsert warning:", dbErr);
      }

      return NextResponse.json({ success: true, item: saved });
    }

    if (type === "package") {
      const saved = await savePackage(data);

      // Persist to Supabase if database accessible
      try {
        await adminSupabase.from("service_packages").upsert({
          category_id: saved.category_id,
          name: saved.name,
          description: saved.description,
          price: saved.price,
          est_duration_minutes: saved.est_duration_minutes,
          inclusions: saved.inclusions || [],
          exclusions: saved.exclusions || [],
          is_active: saved.is_active,
        });
      } catch (dbErr) {
        console.warn("Service package db upsert warning:", dbErr);
      }

      return NextResponse.json({ success: true, item: saved });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/admin/services error:", err);
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
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json(
        { error: "type and id query params required" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    if (type === "package") {
      await deletePackage(id);
      try {
        await adminSupabase.from("service_packages").delete().eq("id", id);
      } catch {}
      return NextResponse.json({ success: true, message: "Paket berhasil dihapus" });
    }

    if (type === "category") {
      await deleteCategory(id);
      try {
        await adminSupabase.from("categories").delete().eq("id", id);
      } catch {}
      return NextResponse.json({ success: true, message: "Kategori berhasil dihapus" });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
