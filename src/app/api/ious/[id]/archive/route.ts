import { NextRequest, NextResponse } from "next/server";
import { archiveIOU, unarchiveIOU } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/session";

// Archive an IOU
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const success = await archiveIOU(userId, id);

    if (!success) {
      return NextResponse.json({ error: "Failed to archive IOU" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Archive IOU error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Unarchive an IOU
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const success = await unarchiveIOU(userId, id);

    if (!success) {
      return NextResponse.json({ error: "Failed to unarchive IOU" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unarchive IOU error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

