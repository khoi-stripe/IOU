import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createIOU, getIOUsByUser, getUserById, enrichIOU } from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { owed, owing } = getIOUsByUser(userId);

    return NextResponse.json({
      user,
      owed: owed.map(enrichIOU),
      owing: owing.map(enrichIOU),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { toPhone, description, photoUrl } = await request.json();

    if (!toPhone || !description) {
      return NextResponse.json(
        { error: "Recipient phone and description required" },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = toPhone.replace(/\D/g, "");

    const iou = createIOU(userId, normalizedPhone, description, photoUrl);

    return NextResponse.json({ iou: enrichIOU(iou) });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

