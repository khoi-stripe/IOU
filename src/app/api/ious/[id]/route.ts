import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIOUById, markIOURepaid, enrichIOU } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const iou = await getIOUById(id);

    if (!iou) {
      return NextResponse.json({ error: "IOU not found" }, { status: 404 });
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
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const { action } = await request.json();

    if (action === "repaid") {
      const iou = await markIOURepaid(id);
      if (!iou) {
        return NextResponse.json({ error: "IOU not found" }, { status: 404 });
      }
      return NextResponse.json({ iou: enrichIOU(iou) });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

