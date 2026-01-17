import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/session";
import { getUserById } from "@/lib/db";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await getUserById(userId);
    
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}


