import { NextResponse } from "next/server";
import { getCategories, getPackages, getPackageById } from "@/lib/data/services";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const category = searchParams.get("category");

    if (id) {
      const pkg = await getPackageById(id);
      if (!pkg) {
        return NextResponse.json(
          { success: false, error: "Paket layanan tidak ditemukan" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, package: pkg });
    }

    const [categories, packages] = await Promise.all([
      getCategories(),
      getPackages(category || undefined),
    ]);

    return NextResponse.json({
      success: true,
      categories,
      packages,
    });
  } catch (err: any) {
    if (err?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw err;
    }
    console.error("GET /api/services error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
