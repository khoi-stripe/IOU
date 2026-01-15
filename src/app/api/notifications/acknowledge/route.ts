import { NextRequest, NextResponse } from "next/server";
import {
  acknowledgeNotification,
  acknowledgeAllNotifications,
  getUserById,
} from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id, all } = await request.json();

    if (all) {
      // Acknowledge all notifications for this user
      await acknowledgeAllNotifications(userId);
    } else if (id) {
      // Acknowledge single notification - pass userId for ownership check
      await acknowledgeNotification(id, userId);
    } else {
      return NextResponse.json(
        { error: "Must provide 'id' or 'all: true'" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
