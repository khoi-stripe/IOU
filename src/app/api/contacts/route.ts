import { NextResponse } from "next/server";
import { getContactsForUser } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/session";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const contacts = await getContactsForUser(userId);
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("[CONTACTS ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
