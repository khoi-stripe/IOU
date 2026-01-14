import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getContactsForUser } from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

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

