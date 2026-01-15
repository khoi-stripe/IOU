import { NextResponse } from "next/server";
import { getUnacknowledgedNotifications, getUserById } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/session";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const notifications = await getUnacknowledgedNotifications(userId);

    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
