import { NextResponse } from "next/server";
import { getSiteContent, getFaqItems } from "@/lib/data/content";

export async function GET() {
  try {
    const [content, faq] = await Promise.all([
      getSiteContent(),
      getFaqItems(true),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        content,
        faq,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat konten situs" },
      { status: 500 }
    );
  }
}
