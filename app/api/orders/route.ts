import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCustomerOrder } from "@/lib/data/orders";

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

    // Fetch user profile & Plus membership status
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, default_address, onboarding_completed, role")
      .eq("id", user.id)
      .single();

    // Check Plus subscription status
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("current_period_end")
      .eq("user_id", user.id)
      .single();

    const isPlus = Boolean(
      sub?.current_period_end && new Date(sub.current_period_end) > new Date()
    );

    // Save default address if requested
    if (save_default_address && address) {
      await supabase
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
      customerName: profile?.full_name || user.email?.split("@")[0] || "Pelanggan",
      customerPhone: profile?.phone || "6281200000000",
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
