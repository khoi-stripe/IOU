import { NextRequest, NextResponse } from "next/server";
import { createIOU, getIOUsByUser, getUserById, enrichIOU } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/session";
import { normalizePhone } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

    const { owed, owing, hasMoreOwed, hasMoreOwing } = await getIOUsByUser(userId, { limit, offset });

    return NextResponse.json({
      user,
      owed: owed.map(enrichIOU),
      owing: owing.map(enrichIOU),
      hasMoreOwed,
      hasMoreOwing,
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
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { toPhone, description, photoUrl } = await request.json();

    // Description is required
    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Normalize phone number (strips country code, non-digits)
    const normalizedToPhone = normalizePhone(toPhone);

    const iou = await createIOU(
      userId,
      normalizedToPhone,
      description || null,
      photoUrl
    );

    return NextResponse.json({ iou: enrichIOU(iou) });
  } catch (error) {
    console.error("Create IOU error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
