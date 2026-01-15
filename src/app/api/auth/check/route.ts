import { NextRequest, NextResponse } from "next/server";
import { checkPhoneExists } from "@/lib/db";
import { checkPhoneCheckRateLimit } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone required" }, { status: 400 });
    }

    // Normalize phone number (remove non-digits)
    const normalizedPhone = phone.replace(/\D/g, "");

    // Rate limit to prevent phone enumeration attacks (separate from PIN attempts)
    const rateLimitResult = await checkPhoneCheckRateLimit(normalizedPhone);
    if (!rateLimitResult.success) {
      const minutesUntilReset = Math.ceil(
        (rateLimitResult.reset - Date.now()) / 1000 / 60
      );
      return NextResponse.json(
        {
          error: `Too many attempts. Try again in ${minutesUntilReset} minute${minutesUntilReset === 1 ? "" : "s"}.`,
        },
        { status: 429 }
      );
    }

    const { exists, hasPin } = await checkPhoneExists(normalizedPhone);

    // Return minimal info to reduce enumeration risk
    // "signup" = new user, "login" = existing user (whether or not they have PIN)
    // We don't reveal whether the phone exists without a PIN vs doesn't exist at all
    return NextResponse.json({
      action: exists ? "login" : "signup",
      // Only tell existing users if they need to set a PIN (for the setpin flow)
      needsPin: exists && !hasPin,
    });
  } catch (error) {
    console.error("[AUTH CHECK ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
