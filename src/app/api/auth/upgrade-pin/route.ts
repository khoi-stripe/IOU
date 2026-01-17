import { NextRequest, NextResponse } from "next/server";
import { getUserById, upgradeUserPin } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    // Must be authenticated
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { currentPin, newPin } = await request.json();

    if (!currentPin || !newPin) {
      return NextResponse.json(
        { error: "Current PIN and new PIN required" },
        { status: 400 }
      );
    }

    // Validate new PIN is 6 digits
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      return NextResponse.json(
        { error: "New PIN must be 6 digits" },
        { status: 400 }
      );
    }

    // Validate current PIN format (4 or 6 digits)
    if (!/^\d{4,6}$/.test(currentPin)) {
      return NextResponse.json(
        { error: "Invalid current PIN format" },
        { status: 400 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current PIN and upgrade to new PIN
    const success = await upgradeUserPin(userId, currentPin, newPin);

    if (!success) {
      return NextResponse.json(
        { error: "Current PIN is incorrect" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[UPGRADE PIN ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


