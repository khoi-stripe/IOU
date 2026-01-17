"use client";

import { useState } from "react";
import ButtonLoader from "./ButtonLoader";

interface PinUpgradeModalProps {
  onUpgrade: (newPin: string) => Promise<boolean>;
}

export default function PinUpgradeModal({
  onUpgrade,
}: PinUpgradeModalProps) {
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pinInputClass =
    "w-full px-4 py-3 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] text-center text-lg";
  const labelClass = "block text-xs uppercase mb-2 font-medium";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPin.length !== 6) {
      setError("PIN must be 6 digits");
      return;
    }

    if (newPin !== confirmPin) {
      setError("PINs don't match");
      return;
    }

    setLoading(true);
    try {
      const success = await onUpgrade(newPin);
      if (!success) {
        setError("Failed to upgrade PIN. Please try again.");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--color-bg)] rounded-lg p-6 w-full max-w-sm space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-bold">Upgrade Your PIN</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            For better security, please upgrade to a 6-digit PIN.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newPin" className={labelClass}>
              New 6-Digit PIN
            </label>
            <input
              id="newPin"
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={newPin}
              onChange={(e) =>
                setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="••••••"
              required
              autoFocus
              className={pinInputClass}
            />
          </div>

          <div>
            <label htmlFor="confirmNewPin" className={labelClass}>
              Confirm PIN
            </label>
            <input
              id="confirmNewPin"
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

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || newPin.length !== 6 || confirmPin.length !== 6}
            className="w-full py-3 bg-[var(--color-accent)] text-[var(--color-bg)] rounded-full text-sm uppercase font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            {loading ? <ButtonLoader /> : "Upgrade PIN"}
          </button>

        </form>
      </div>
    </div>
  );
}

