import { NextResponse } from "next/server";
import { getArchivedIOUs, enrichIOU } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/session";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const ious = await getArchivedIOUs(userId);

    return NextResponse.json({ ious: ious.map(enrichIOU) });
  } catch (error) {
    console.error("Get archived IOUs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

