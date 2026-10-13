import { NextResponse } from "next/server";
import { checkEmailRoleAvailability, RoleType } from "@/lib/auth/email-check";

export async function POST(request: Request) {
  try {
    const { email, role } = await request.json();
    if (!email || !role) {
      return NextResponse.json({ error: "Email dan peran wajib disertakan." }, { status: 400 });
    }

    const result = await checkEmailRoleAvailability(email, role as RoleType);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
