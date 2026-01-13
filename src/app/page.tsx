"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, displayName: name }),
      });

      if (!res.ok) {
        throw new Error("Failed to sign in");
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold" style={{ letterSpacing: '0.3em' }}>👁️🅾️🐑</h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          Track favors between friends.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            className="w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

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
            className="w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-[var(--color-accent)] text-[var(--color-bg)] border border-[var(--color-accent)] hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {loading ? "..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

