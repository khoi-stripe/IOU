"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "phone" | "signup" | "login" | "setpin";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    // Validate PIN confirmation for signup and setpin
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

  return (
    <div className="h-dvh flex flex-col px-2">
      {/* Header */}
      <header className="pt-8 pb-4 text-center shrink-0">
        <h1 className="text-2xl" style={{ letterSpacing: "0.3em" }}>
          👁️🅾️🐑
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-2">
          Track favors between friends.
        </p>
      </header>

      {/* Spacer - pushes form to bottom */}
      <div className="flex-1 min-h-0" />

      {/* Form content */}
      <div className="shrink-0 pb-8">
        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="555-123-4567"
                required
                autoFocus
                className={inputClass}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button type="submit" disabled={loading} className={primaryButtonClass + " w-full"}>
              {loading ? "..." : "Continue"}
            </button>
          </form>
        )}

        {step === "signup" && (
          <form onSubmit={handleAuthSubmit} className="space-y-6">
            <h2 className="text-lg font-medium">Create your account.</h2>

            <div>
              <label htmlFor="name" className={labelClass}>
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bruce"
                required
                autoFocus
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="pin" className={labelClass}>
                Create a 4-Digit PIN
              </label>
              <input
                id="pin"
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
              <label htmlFor="confirmPin" className={labelClass}>
                Confirm PIN
              </label>
              <input
                id="confirmPin"
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

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={handleBack} className={secondaryButtonClass}>
                Back
              </button>
              <button
                type="submit"
                disabled={loading || pin.length !== 4 || confirmPin.length !== 4}
                className={primaryButtonClass}
              >
                {loading ? "..." : "Create Account"}
              </button>
            </div>
          </form>
        )}

        {step === "login" && (
          <form onSubmit={handleAuthSubmit} className="space-y-6">
            <div>
              <label htmlFor="pin" className={labelClass}>
                PIN
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                required
                autoFocus
                className={pinInputClass}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

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
        )}

        {step === "setpin" && (
          <form onSubmit={handleAuthSubmit} className="space-y-6">
            <h2 className="text-lg font-medium">Create your PIN.</h2>

            <div>
              <label htmlFor="pin" className={labelClass}>
                Create a 4-Digit PIN
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                required
                autoFocus
                className={pinInputClass}
              />
            </div>

            <div>
              <label htmlFor="confirmPin" className={labelClass}>
                Confirm PIN
              </label>
              <input
                id="confirmPin"
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

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={handleBack} className={secondaryButtonClass}>
                Back
              </button>
              <button
                type="submit"
                disabled={loading || pin.length !== 4 || confirmPin.length !== 4}
                className={primaryButtonClass}
              >
                {loading ? "..." : "Log In"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
