import { NextRequest, NextResponse } from "next/server";
import { getIOUByShareToken, enrichIOU } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const iou = await getIOUByShareToken(token);

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

