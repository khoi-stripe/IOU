import { NextRequest, NextResponse } from "next/server";
import { getIOUById, markIOURepaid, enrichIOU, getUserById } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/session";

/**
 * Check if a user has access to view an IOU
 * User can view if they are the creator, recipient, or the IOU is addressed to their phone
 */
async function userCanAccessIOU(
  userId: string,
  iou: Awaited<ReturnType<typeof getIOUById>>
): Promise<boolean> {
  if (!iou) return false;

  // User is the creator
  if (iou.from_user_id === userId) return true;

  // User is the recipient
  if (iou.to_user_id === userId) return true;

  // IOU is addressed to user's phone number
  const user = await getUserById(userId);
  if (user && iou.to_phone === user.phone) return true;

  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const iou = await getIOUById(id);

    if (!iou) {
      return NextResponse.json({ error: "IOU not found" }, { status: 404 });
    }

    // Authorization check
    const hasAccess = await userCanAccessIOU(userId, iou);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ iou: enrichIOU(iou) });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const { action } = await request.json();

    if (action === "repaid") {
      // First fetch the IOU to check ownership
      const iou = await getIOUById(id);

      if (!iou) {
        return NextResponse.json({ error: "IOU not found" }, { status: 404 });
      }

      // Either party (ower or owee) can mark it as repaid
      const user = await getUserById(userId);
      const isOwer = iou.from_user_id === userId;
      const isOwee = iou.to_user_id === userId || (user && iou.to_phone === user.phone);
      
      if (!isOwer && !isOwee) {
        return NextResponse.json(
          { error: "Only involved parties can mark this as repaid" },
          { status: 403 }
        );
      }

      const updated = await markIOURepaid(id, userId);
      if (!updated) {
        return NextResponse.json(
          { error: "Failed to update IOU" },
          { status: 500 }
        );
      }

      return NextResponse.json({ iou: enrichIOU(updated) });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
