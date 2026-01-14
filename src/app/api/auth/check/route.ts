import { NextRequest, NextResponse } from "next/server";
import { checkPhoneExists } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: "Phone required" },
        { status: 400 }
      );
    }

    // Normalize phone number (remove non-digits)
    const normalizedPhone = phone.replace(/\D/g, "");

    const { exists, hasPin } = await checkPhoneExists(normalizedPhone);

    return NextResponse.json({ exists, hasPin });
  } catch (error) {
    console.error("[AUTH CHECK ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

