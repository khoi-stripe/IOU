import { NextRequest, NextResponse } from "next/server";
import { createUser, verifyUser, setUserPin } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";
import { checkAuthRateLimit } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    const { phone, displayName, pin, action } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json(
        { error: "Phone and PIN required" },
        { status: 400 }
      );
    }

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be 4 digits" },
        { status: 400 }
      );
    }

    // Normalize phone number (remove non-digits)
    const normalizedPhone = phone.replace(/\D/g, "");

    // Rate limit check for login attempts (brute-force protection)
    const rateLimitResult = await checkAuthRateLimit(normalizedPhone);
    if (!rateLimitResult.success) {
      const resetDate = new Date(rateLimitResult.reset);
      const minutesUntilReset = Math.ceil(
        (rateLimitResult.reset - Date.now()) / 1000 / 60
      );
      return NextResponse.json(
        {
          error: `Too many attempts. Try again in ${minutesUntilReset} minute${minutesUntilReset === 1 ? "" : "s"}.`,
          retryAfter: resetDate.toISOString(),
        },
        { status: 429 }
      );
    }

    let user;

    if (action === "signup") {
      // Signup: requires name, creates new user with PIN
      if (!displayName) {
        return NextResponse.json(
          { error: "Name required for signup" },
          { status: 400 }
        );
      }

      try {
        user = await createUser(normalizedPhone, displayName, pin);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message === "Phone number already registered"
        ) {
          return NextResponse.json(
            { error: "Phone number already registered" },
            { status: 409 }
          );
        }
        throw err;
      }
    } else if (action === "setpin") {
      // Set PIN for existing user who doesn't have one
      user = await setUserPin(normalizedPhone, pin);
      if (!user) {
        return NextResponse.json(
          { error: "Could not set PIN" },
          { status: 400 }
        );
      }
    } else {
      // Login: verify PIN
      user = await verifyUser(normalizedPhone, pin);
      if (!user) {
        return NextResponse.json(
          { error: "Invalid phone or PIN" },
          { status: 401 }
        );
      }
    }

    // Set a secure signed JWT session cookie
    await setSessionCookie(user.id);

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[AUTH ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
