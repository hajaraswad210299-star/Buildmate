import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/supabase/auth";
import { getSiteContent, saveSiteContentSection, SiteContentState } from "@/lib/data/content";
import { logAdminAudit } from "@/lib/data/audit";

export async function GET() {
  try {
    const auth = await requireApiPermission("content.manage");
    if (!auth.authorized) {
      return auth.response;
    }

    const content = await getSiteContent();
    return NextResponse.json({
      success: true,
      content,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireApiPermission("content.manage");
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const { section, value } = body;

    const validSections: (keyof SiteContentState)[] = [
      "announcement",
      "hero",
      "plus_banner",
      "legal",
    ];

    if (!section || !validSections.includes(section)) {
      return NextResponse.json(
        { error: `Bagian "${section}" tidak valid.` },
        { status: 400 }
      );
    }

    // Specific field validations
    if (section === "announcement" && value?.text && value.text.length > 80) {
      return NextResponse.json(
        { error: "Teks pengumuman maksimal 80 karakter." },
        { status: 400 }
      );
    }

    const updated = await saveSiteContentSection(section, value, auth.user.id);

    await logAdminAudit({
      eventType: "content_updated",
      actorId: auth.user.id,
      actorName: auth.profile?.full_name || auth.user.email || "Admin",
      details: {
        section,
      },
    });

    return NextResponse.json({
      success: true,
      section,
      value: updated,
      message: `Konten bagian ${section} berhasil diperbarui.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
