import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/supabase/auth";
import {
  getFaqItems,
  saveFaqItem,
  deleteFaqItem,
  reorderFaqItems,
} from "@/lib/data/content";
import { logAdminAudit } from "@/lib/data/audit";

export async function GET() {
  const auth = await requireApiPermission("content.manage");
  if (!auth.authorized) return auth.response;
  try {
    const items = await getFaqItems(false);
    return NextResponse.json({
      success: true,
      items,
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
    const auth = await requireApiPermission("content.manage");
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const { question, answer, is_active } = body;

    if (!question || !question.trim() || !answer || !answer.trim()) {
      return NextResponse.json(
        { error: "Pertanyaan dan jawaban wajib diisi." },
        { status: 400 }
      );
    }

    const saved = await saveFaqItem({
      question,
      answer,
      is_active: is_active !== undefined ? is_active : true,
    });

    await logAdminAudit({
      eventType: "faq_created",
      actorId: auth.user.id,
      actorName: auth.profile?.full_name || auth.user.email || "Admin",
      details: {
        faq_id: saved.id,
        question: saved.question,
      },
    });

    return NextResponse.json({
      success: true,
      item: saved,
      message: "Item FAQ berhasil ditambahkan.",
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

    // Reorder action
    if (body.action === "reorder" && Array.isArray(body.orderedIds)) {
      const items = await reorderFaqItems(body.orderedIds);
      return NextResponse.json({
        success: true,
        items,
        message: "Urutan FAQ berhasil diperbarui.",
      });
    }

    // Update single FAQ item
    const { id, question, answer, is_active, sort_order } = body;
    if (!id || !question || !answer) {
      return NextResponse.json(
        { error: "Data item FAQ tidak lengkap." },
        { status: 400 }
      );
    }

    const updated = await saveFaqItem({
      id,
      question,
      answer,
      is_active,
      sort_order,
    });

    await logAdminAudit({
      eventType: "faq_updated",
      actorId: auth.user.id,
      actorName: auth.profile?.full_name || auth.user.email || "Admin",
      details: {
        faq_id: id,
        question: updated.question,
      },
    });

    return NextResponse.json({
      success: true,
      item: updated,
      message: "Item FAQ berhasil diperbarui.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApiPermission("content.manage");
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID FAQ wajib disertakan." }, { status: 400 });
    }

    await deleteFaqItem(id);

    await logAdminAudit({
      eventType: "faq_deleted",
      actorId: auth.user.id,
      actorName: auth.profile?.full_name || auth.user.email || "Admin",
      details: { faq_id: id },
    });

    return NextResponse.json({
      success: true,
      message: "Item FAQ berhasil dihapus.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
