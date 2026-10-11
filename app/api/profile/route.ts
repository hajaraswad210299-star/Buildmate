import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, phone, default_address, avatar_url } = body;

    const adminSupabase = createAdminClient();

    // Fetch existing profile to preserve unchanged fields
    const { data: existing } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const fallbackAvatar =
      avatar_url ||
      existing?.avatar_url ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null;

    const payload: any = {
      id: user.id,
      full_name: full_name?.trim() || existing?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0],
      phone: phone ? phone.trim().replace(/^\+/, "") : existing?.phone || null,
      default_address: default_address !== undefined ? (default_address?.trim() || null) : existing?.default_address || null,
      avatar_url: fallbackAvatar,
      onboarding_completed: true,
      role: existing?.role || "customer",
    };

    const { data, error } = await adminSupabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Profile upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (err: any) {
    console.error("Profile API route error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
