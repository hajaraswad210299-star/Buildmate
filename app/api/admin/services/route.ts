import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiPermission } from "@/lib/supabase/auth";
import {
  saveCategory,
  savePackage,
  deleteCategory,
  deletePackage,
  getCategories,
  getPackages,
} from "@/lib/data/services";

export async function GET() {
  try {
    const auth = await requireApiPermission("services.view");
    if (!auth.authorized) {
      return auth.response;
    }

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
    const auth = await requireApiPermission("services.manage");
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: "type and data are required" },
        { status: 400 }
      );
    }

    if (type === "category") {
      const saved = await saveCategory(data);
      try {
        revalidatePath("/");
        revalidatePath("/search");
        revalidatePath("/services");
        revalidatePath("/admin/services");
      } catch {}
      return NextResponse.json({ success: true, item: saved });
    }

    if (type === "package") {
      const saved = await savePackage(data);
      try {
        revalidatePath("/");
        revalidatePath("/search");
        revalidatePath("/services");
        revalidatePath(`/services/${saved.id}`);
        revalidatePath("/admin/services");
      } catch {}
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
    const auth = await requireApiPermission("services.manage");
    if (!auth.authorized) {
      return auth.response;
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

    if (type === "package") {
      await deletePackage(id);
      try {
        revalidatePath("/");
        revalidatePath("/search");
        revalidatePath("/services");
        revalidatePath("/admin/services");
      } catch {}
      return NextResponse.json({ success: true, message: "Paket berhasil dihapus" });
    }

    if (type === "category") {
      await deleteCategory(id);
      try {
        revalidatePath("/");
        revalidatePath("/search");
        revalidatePath("/services");
        revalidatePath("/admin/services");
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
