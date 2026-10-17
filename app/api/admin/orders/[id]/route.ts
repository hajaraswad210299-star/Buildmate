import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/supabase/auth";
import {
  getOrderById,
  transitionOrder,
  addOrderPhoto,
  updateAdminNotes,
  replaceWorker,
  resolveComplaint,
  manualAssignWorker,
  retryDispatch,
  releaseWorkerAndRedispatch,
} from "@/lib/data/orders";
import type { OrderStatus } from "@/lib/orders/transitions";

const AUTO_COMPLETE_MINUTES = Number(process.env.AUTO_COMPLETE_MINUTES) || 1440;

/**
 * Admin order actions (A03, B10). Every action runs on the server so it is
 * persisted, guarded by `orders.manage`, and validated by the B5 state machine.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiPermission("orders.manage");
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action as string;

    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    let result: { success: boolean; error?: string; order?: unknown };

    switch (action) {
      case "transition": {
        const toStatus = body.to_status as OrderStatus;
        const note = typeof body.note === "string" ? body.note.trim() : "";

        if (toStatus === "cancelled" && !note) {
          return NextResponse.json({ error: "Alasan pembatalan wajib diisi." }, { status: 400 });
        }
        // B5: admin completion only after AUTO_COMPLETE_MINUTES, with a required note
        if (toStatus === "completed") {
          if (!note) {
            return NextResponse.json({ error: "Catatan wajib diisi." }, { status: 400 });
          }
          const since = order.awaiting_confirmation_at
            ? Date.now() - new Date(order.awaiting_confirmation_at).getTime()
            : 0;
          if (since < AUTO_COMPLETE_MINUTES * 60 * 1000) {
            return NextResponse.json(
              { error: "Pesanan baru bisa diselesaikan admin setelah batas waktu konfirmasi pelanggan lewat." },
              { status: 400 }
            );
          }
        }

        result = await transitionOrder(order.id, toStatus, "admin", {
          actorName: auth.roleName === "Admin Utama" ? "Admin BuildMate" : auth.roleName,
          note: note || undefined,
          cancelReason: toStatus === "cancelled" ? note : undefined,
        });
        break;
      }

      case "assign_worker":
        result = await manualAssignWorker(order.id, body.worker, body.note);
        break;

      case "retry_dispatch":
        result = await retryDispatch(order.id);
        break;

      case "release_worker":
        if (!body.reason || !String(body.reason).trim()) {
          return NextResponse.json({ error: "Alasan wajib diisi." }, { status: 400 });
        }
        result = await releaseWorkerAndRedispatch(order.id, String(body.reason), Boolean(body.consent));
        break;

      case "replace_worker":
        if (!body.consent) {
          return NextResponse.json({ error: "Centang persetujuan pelanggan terlebih dahulu." }, { status: 400 });
        }
        result = await replaceWorker(order.id, body.worker, String(body.note || ""));
        break;

      case "resolve_complaint":
        if (!["warranty_rework", "close_without_action", "cancel_refund"].includes(body.resolution_action)) {
          return NextResponse.json({ error: "Tindakan komplain tidak valid." }, { status: 400 });
        }
        if (!body.resolution || !String(body.resolution).trim()) {
          return NextResponse.json({ error: "Tuliskan deskripsi resolusi komplain." }, { status: 400 });
        }
        result = await resolveComplaint(order.id, String(body.resolution), body.resolution_action);
        break;

      case "add_photo":
        if (!body.photo?.storage_path || !["problem", "result"].includes(body.photo?.type)) {
          return NextResponse.json({ error: "Data foto tidak valid." }, { status: 400 });
        }
        result = await addOrderPhoto(order.id, {
          type: body.photo.type,
          source_note: String(body.photo.source_note || ""),
          storage_path: String(body.photo.storage_path),
          uploaded_by: "admin",
        });
        break;

      case "update_notes":
        result = await updateAdminNotes(order.id, String(body.notes ?? ""));
        break;

      default:
        return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Aksi gagal dijalankan." }, { status: 400 });
    }

    const fresh = await getOrderById(order.id);
    return NextResponse.json({ success: true, order: fresh });
  } catch (err: any) {
    console.error("POST /api/admin/orders/[id] error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
