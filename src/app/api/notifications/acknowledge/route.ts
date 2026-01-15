import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { acknowledgeNotification, acknowledgeAllNotifications, getUserById } from "@/lib/db";

export async function POST(request: NextRequest) {
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

    const { id, all } = await request.json();

    if (all) {
      // Acknowledge all notifications for this user
      await acknowledgeAllNotifications(userId);
    } else if (id) {
      // Acknowledge single notification
      await acknowledgeNotification(id);
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

