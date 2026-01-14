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
    setName("");
    setError("");
  }

  return (
    <div className="space-y-8 pt-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold" style={{ letterSpacing: '0.3em' }}>👁️🅾️🐑</h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          Track favors between friends.
        </p>
      </header>

      {step === "phone" && (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="555-123-4567"
              required
              autoFocus
              className="w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[var(--color-accent)] text-[var(--color-bg)] border border-[var(--color-accent)] hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            {loading ? "..." : "Continue"}
          </button>
        </form>
      )}

      {step === "signup" && (
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <button type="button" onClick={handleBack} className="hover:underline">
              ← Back
            </button>
            <span>•</span>
            <span>{phone}</span>
          </div>

          <p className="text-sm">Create your account</p>

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm">
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex"
              required
              autoFocus
              className="w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="pin" className="block text-sm">
              Create a 4-digit PIN
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
              className="w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] tracking-[0.5em] text-center text-lg"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full py-2 bg-[var(--color-accent)] text-[var(--color-bg)] border border-[var(--color-accent)] hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            {loading ? "..." : "Create Account"}
          </button>
        </form>
      )}

      {step === "login" && (
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <button type="button" onClick={handleBack} className="hover:underline">
              ← Back
            </button>
            <span>•</span>
            <span>{phone}</span>
          </div>

          <p className="text-sm">Welcome back! Enter your PIN.</p>

          <div className="space-y-2">
            <label htmlFor="pin" className="block text-sm">
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
              className="w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] tracking-[0.5em] text-center text-lg"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full py-2 bg-[var(--color-accent)] text-[var(--color-bg)] border border-[var(--color-accent)] hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            {loading ? "..." : "Log In"}
          </button>
        </form>
      )}

      {step === "setpin" && (
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <button type="button" onClick={handleBack} className="hover:underline">
              ← Back
            </button>
            <span>•</span>
            <span>{phone}</span>
          </div>

          <p className="text-sm">Welcome back! Set up a PIN to secure your account.</p>

          <div className="space-y-2">
            <label htmlFor="pin" className="block text-sm">
              Create a 4-digit PIN
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
              className="w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] tracking-[0.5em] text-center text-lg"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full py-2 bg-[var(--color-accent)] text-[var(--color-bg)] border border-[var(--color-accent)] hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            {loading ? "..." : "Set PIN & Continue"}
          </button>
        </form>
      )}
    </div>
  );
}
