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

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { owed, owing } = await getIOUsByUser(userId);

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

    // Require at least one of: recipient, description, or photo
    if (!toPhone && !description && !photoUrl) {
      return NextResponse.json(
        { error: "At least a recipient, description, or photo is required" },
        { status: 400 }
      );
    }

    // Normalize phone number if provided
    const normalizedPhone = toPhone ? toPhone.replace(/\D/g, "") : null;

    const iou = await createIOU(userId, normalizedPhone, description || null, photoUrl);

    return NextResponse.json({ iou: enrichIOU(iou) });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

