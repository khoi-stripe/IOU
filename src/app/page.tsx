"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

type Step = "phone" | "signup" | "login" | "setpin";

export default function Home() {
  const router = useRouter();
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const loginPinRef = useRef<HTMLInputElement>(null);
  const signupNameRef = useRef<HTMLInputElement>(null);
  const setPinRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("phone");
  const [prevStep, setPrevStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Focus appropriate input when step changes - must be very fast to keep keyboard open
  useEffect(() => {
    // Small timeout to ensure DOM is updated, but fast enough to keep keyboard
    const timer = setTimeout(() => {
      if (step === "phone") {
        phoneInputRef.current?.focus();
      } else if (step === "login") {
        loginPinRef.current?.focus();
      } else if (step === "signup") {
        signupNameRef.current?.focus();
      } else if (step === "setpin") {
        setPinRef.current?.focus();
      }
    }, 1);
    return () => clearTimeout(timer);
  }, [step]);

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        throw new Error("Failed to check phone");
      }

      const { exists, hasPin } = await res.json();

      setPrevStep("phone");
      if (!exists) {
        setStep("signup");
      } else if (!hasPin) {
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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to authenticate");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setPrevStep(step);
    setStep("phone");
    setPin("");
    setConfirmPin("");
    setName("");
    setError("");
  }

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

  // Determine slide direction based on navigation
  const goingForward = prevStep === "phone";

  return (
    <div className="h-dvh flex flex-col px-4 overflow-hidden">
      {/* Header - fixed at top */}
      <header className="pt-8 pb-4 text-center shrink-0 bg-[var(--color-bg)]">
        <h1 className="text-2xl">
          <Logo />
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-2">
          Favors between friends.
        </p>
      </header>

      {/* Form area */}
      <div className="flex-1 flex flex-col justify-end pb-8 relative">
        {/* Phone step */}
        <div
          className={`transition-all duration-200 ease-out ${
            step === "phone"
              ? "opacity-100 translate-x-0"
              : goingForward
              ? "opacity-0 -translate-x-full absolute inset-x-4 bottom-8 pointer-events-none"
              : "opacity-0 translate-x-full absolute inset-x-4 bottom-8 pointer-events-none"
          }`}
        >
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
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

            {error && step === "phone" && <p className="text-sm text-red-500">{error}</p>}

            <button type="submit" disabled={loading} className={primaryButtonClass + " w-full"}>
              {loading ? "..." : "Continue"}
            </button>
          </form>
        </div>

        {/* Login step */}
        <div
          className={`transition-all duration-200 ease-out ${
            step === "login"
              ? "opacity-100 translate-x-0"
              : goingForward
              ? "opacity-0 translate-x-full absolute inset-x-4 bottom-8 pointer-events-none"
              : "opacity-0 -translate-x-full absolute inset-x-4 bottom-8 pointer-events-none"
          }`}
        >
          <form onSubmit={handleAuthSubmit} className="space-y-6">
            <div>
              <label htmlFor="loginPin" className={labelClass}>
                PIN
              </label>
              <input
                ref={loginPinRef}
                id="loginPin"
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                required
                className={pinInputClass}
              />
            </div>

            {error && step === "login" && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={handleBack} className={secondaryButtonClass}>
                Back
              </button>
              <button
                type="submit"
                disabled={loading || pin.length !== 4}
                className={primaryButtonClass}
              >
                {loading ? "..." : "Log In"}
              </button>
            </div>
          </form>
        </div>

        {/* Signup step */}
        <div
          className={`transition-all duration-200 ease-out ${
            step === "signup"
              ? "opacity-100 translate-x-0"
              : goingForward
              ? "opacity-0 translate-x-full absolute inset-x-4 bottom-8 pointer-events-none"
              : "opacity-0 -translate-x-full absolute inset-x-4 bottom-8 pointer-events-none"
          }`}
        >
          <form onSubmit={handleAuthSubmit} className="space-y-6">
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
                Create a 4-Digit PIN
              </label>
              <input
                id="signupPin"
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
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
                pattern="\d{4}"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                required
                className={pinInputClass}
              />
            </div>

            {error && step === "signup" && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={handleBack} className={secondaryButtonClass}>
                Back
              </button>
              <button
                type="submit"
                disabled={loading || pin.length !== 4 || confirmPin.length !== 4 || !name}
                className={primaryButtonClass}
              >
                {loading ? "..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>

        {/* Set PIN step */}
        <div
          className={`transition-all duration-200 ease-out ${
            step === "setpin"
              ? "opacity-100 translate-x-0"
              : goingForward
              ? "opacity-0 translate-x-full absolute inset-x-4 bottom-8 pointer-events-none"
              : "opacity-0 -translate-x-full absolute inset-x-4 bottom-8 pointer-events-none"
          }`}
        >
          <form onSubmit={handleAuthSubmit} className="space-y-6">
            <div>
              <label htmlFor="setPin" className={labelClass}>
                Create a 4-Digit PIN
              </label>
              <input
                ref={setPinRef}
                id="setPin"
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
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
                pattern="\d{4}"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                required
                className={pinInputClass}
              />
            </div>

            {error && step === "setpin" && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={handleBack} className={secondaryButtonClass}>
                Back
              </button>
              <button
                type="submit"
                disabled={loading || pin.length !== 4 || confirmPin.length !== 4}
                className={primaryButtonClass}
              >
                {loading ? "..." : "Set PIN"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
