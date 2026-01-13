import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { phone, displayName } = await request.json();

    if (!phone || !displayName) {
      return NextResponse.json(
        { error: "Phone and name required" },
        { status: 400 }
      );
    }

    // Normalize phone number (remove non-digits)
    const normalizedPhone = phone.replace(/\D/g, "");

    const user = createUser(normalizedPhone, displayName);

    // Set a simple cookie with user ID
    const cookieStore = await cookies();
    cookieStore.set("userId", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

