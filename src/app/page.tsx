"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import PinUpgradeModal from "@/components/PinUpgradeModal";

type Step = "phone" | "signup" | "login" | "setpin";

export default function Home() {
  const router = useRouter();
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const loginPinRef = useRef<HTMLInputElement>(null);
  const signupNameRef = useRef<HTMLInputElement>(null);
  const setPinRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // PIN upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentPinForUpgrade, setCurrentPinForUpgrade] = useState("");

  // Helper to redirect after login - auto-claims pending IOU if any
  async function redirectAfterLogin() {
    const pendingClaimIOUId = sessionStorage.getItem("pendingClaimIOUId");
    if (pendingClaimIOUId) {
      sessionStorage.removeItem("pendingClaimIOUId");
      // Auto-claim the IOU
      try {
        const res = await fetch(`/api/ious/${pendingClaimIOUId}/claim`, { method: "POST" });
        if (res.ok) {
          // Claimed successfully - go to "owed" tab where the IOU appears
          router.push("/dashboard?tab=owed");
          return;
        }
      } catch {
        // Silently fail - user can claim manually if needed
      }
    }
    router.push("/dashboard");
  }

  // Focus appropriate input when step changes
  useEffect(() => {
    if (step === "phone") {
      phoneInputRef.current?.focus();
    } else if (step === "login") {
      loginPinRef.current?.focus();
    } else if (step === "signup") {
      signupNameRef.current?.focus();
    } else if (step === "setpin") {
      setPinRef.current?.focus();
    }
  }, [step]);

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Focus next input SYNCHRONOUSLY while still in user gesture context
    // This keeps the keyboard open on mobile (focus must happen before async)
    loginPinRef.current?.focus();
    
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      const { action, needsPin } = data;

      if (action === "signup") {
        setStep("signup");
      } else if (needsPin) {
        setStep("setpin");
      } else {
        setStep("login");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if ((step === "signup" || step === "setpin") && pin !== confirmPin) {
      setError("PINs don't match");
      return;
    }

    setLoading(true);

    try {
      const actionMap = {
        signup: "signup",
        setpin: "setpin",
        login: "login",
      } as const;

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          displayName: name,
          pin,
          action: actionMap[step as keyof typeof actionMap],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to authenticate");
      }

      // Check if user needs to upgrade their PIN
      if (data.needsPinUpgrade) {
        setCurrentPinForUpgrade(pin);
        setShowUpgradeModal(true);
      } else {
        await redirectAfterLogin();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handlePinUpgrade(newPin: string): Promise<boolean> {
    try {
      const res = await fetch("/api/auth/upgrade-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin: currentPinForUpgrade,
          newPin,
        }),
      });

      if (!res.ok) {
        return false;
      }

      await redirectAfterLogin();
      return true;
    } catch {
      return false;
    }
  }

  function handleBack() {
    setStep("phone");
    setPin("");
    setConfirmPin("");
    setName("");
    setError("");
  }

  // PIN length depends on step: 6 for new, 4-6 for login
  const isLogin = step === "login";
  const pinLength = isLogin ? 6 : 6; // Max length for input
  const minPinLength = isLogin ? 4 : 6; // Min valid length

  // Shared styles
  const labelClass = "block text-xs uppercase mb-2 font-medium";
  const inputClass =
    "w-full px-4 py-3 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] rounded-lg focus:outline-none focus:border-[var(--color-accent)]";
  const pinInputClass =
    "w-full px-4 py-3 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] text-center text-lg";
  const primaryButtonClass =
    "flex-1 py-3 bg-[var(--color-accent)] text-[var(--color-bg)] rounded-full text-sm uppercase font-medium hover:opacity-80 disabled:opacity-50 transition-opacity";
  const secondaryButtonClass =
    "flex-1 py-3 border border-[var(--color-border)] text-[var(--color-text)] rounded-full text-sm uppercase font-medium hover:border-[var(--color-accent)] transition-colors";

  return (
    <div className="h-dvh flex flex-col px-4">
      {/* PIN Upgrade Modal */}
      {showUpgradeModal && (
        <PinUpgradeModal onUpgrade={handlePinUpgrade} />
      )}

      {/* Header - fixed at top */}
      <header className="pt-8 pb-4 text-center shrink-0 bg-[var(--color-bg)]">
        <h1 className="text-2xl">
          <Logo />
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-2">
          Favors between friends.
        </p>
      </header>

      {/* Form area - inactive forms are invisible but focusable (opacity-0, not display:none) */}
      <div className="flex-1 flex flex-col justify-end pb-8 relative">
        {/* Phone step */}
        <form 
          onSubmit={handlePhoneSubmit} 
          className={`space-y-6 ${step !== "phone" ? "opacity-0 absolute inset-x-0 bottom-8 -z-10 pointer-events-none" : ""}`}
        >
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone Number
            </label>
            <input
              ref={phoneInputRef}
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="555-123-4567"
              required
              autoFocus
              className={inputClass}
            />
          </div>

          {step === "phone" && error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            tabIndex={-1}
            className={primaryButtonClass + " w-full"}
          >
            {loading ? "..." : "Continue"}
          </button>
        </form>

        {/* Login step */}
        <form 
          onSubmit={handleAuthSubmit} 
          className={`space-y-6 ${step !== "login" ? "opacity-0 absolute inset-x-0 bottom-8 -z-10 pointer-events-none" : ""}`}
        >
          <div>
            <label htmlFor="loginPin" className={labelClass}>
              PIN
            </label>
            <input
              ref={loginPinRef}
              id="loginPin"
              type="password"
              inputMode="numeric"
              pattern="\d{4,6}"
              maxLength={pinLength}
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, pinLength))
              }
              placeholder="••••••"
              required
              className={pinInputClass}
            />
          </div>

          {step === "login" && error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBack}
              className={secondaryButtonClass}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || pin.length < minPinLength}
              className={primaryButtonClass}
            >
              {loading ? "..." : "Log In"}
            </button>
          </div>
        </form>

        {/* Signup step */}
        <form 
          onSubmit={handleAuthSubmit} 
          className={`space-y-6 ${step !== "signup" ? "opacity-0 absolute inset-x-0 bottom-8 -z-10 pointer-events-none" : ""}`}
        >
          <div>
            <label htmlFor="name" className={labelClass}>
              Your Name
            </label>
            <input
              ref={signupNameRef}
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bruce"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="signupPin" className={labelClass}>
              Create a 6-Digit PIN
            </label>
            <input
              id="signupPin"
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="••••••"
              required
              className={pinInputClass}
            />
          </div>

          <div>
            <label htmlFor="signupConfirmPin" className={labelClass}>
              Confirm PIN
            </label>
            <input
              id="signupConfirmPin"
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={confirmPin}
              onChange={(e) =>
                setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="••••••"
              required
              className={pinInputClass}
            />
          </div>

          {step === "signup" && error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBack}
              className={secondaryButtonClass}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                pin.length !== 6 ||
                confirmPin.length !== 6 ||
                !name
              }
              className={primaryButtonClass}
            >
              {loading ? "..." : "Create Account"}
            </button>
          </div>
        </form>

        {/* Set PIN step */}
        <form 
          onSubmit={handleAuthSubmit} 
          className={`space-y-6 ${step !== "setpin" ? "opacity-0 absolute inset-x-0 bottom-8 -z-10 pointer-events-none" : ""}`}
        >
          <div>
            <label htmlFor="setPin" className={labelClass}>
              Create a 6-Digit PIN
            </label>
            <input
              ref={setPinRef}
              id="setPin"
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="••••••"
              required
              className={pinInputClass}
            />
          </div>

          <div>
            <label htmlFor="setConfirmPin" className={labelClass}>
              Confirm PIN
            </label>
            <input
              id="setConfirmPin"
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={confirmPin}
              onChange={(e) =>
                setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="••••••"
              required
              className={pinInputClass}
            />
          </div>

          {step === "setpin" && error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBack}
              className={secondaryButtonClass}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || pin.length !== 6 || confirmPin.length !== 6}
              className={primaryButtonClass}
            >
              {loading ? "..." : "Set PIN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
