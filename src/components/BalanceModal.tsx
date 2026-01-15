"use client";

import { useEffect } from "react";
import Logo from "./Logo";

interface BalanceModalProps {
  oweCount: number;
  owedCount: number;
  onClose: () => void;
}

export default function BalanceModal({ oweCount, owedCount, onClose }: BalanceModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const total = oweCount + owedCount;
  const maxRadius = 150; // max radius in pixels

  // Check if it's a 1:1 ratio (or close to it)
  const isBalanced = oweCount > 0 && owedCount > 0 && oweCount === owedCount;

  // Calculate circle sizes proportionally
  let blackRadius = 0;
  let whiteRadius = 0;

  if (total > 0 && !isBalanced) {
    // The larger count gets the max radius, smaller is proportional
    if (owedCount >= oweCount) {
      blackRadius = maxRadius;
      whiteRadius = oweCount > 0 ? (oweCount / owedCount) * maxRadius : 0;
    } else {
      whiteRadius = maxRadius;
      blackRadius = owedCount > 0 ? (owedCount / oweCount) * maxRadius : 0;
    }
  }

  // Ensure minimum visible size if count > 0
  if (oweCount > 0 && whiteRadius < 20 && !isBalanced) whiteRadius = 20;
  if (owedCount > 0 && blackRadius < 20 && !isBalanced) blackRadius = 20;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex justify-center">
      <div className="flex flex-col w-full max-w-md px-2">
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-4 shrink-0">
          <button className="text-lg -mt-[6px]">
            <Logo />
          </button>
          <button
            onClick={onClose}
            className="text-2xl font-bold w-10 h-10 flex items-center justify-center hover:opacity-60 transition-opacity"
          >
            ×
          </button>
        </header>

        {/* Visualization */}
        <div className="flex-1 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* Balanced state - half moon */}
          {isBalanced && (
            <div
              className="rounded-full overflow-hidden border-2 border-[var(--color-accent)]"
              style={{
                width: maxRadius * 2,
                height: maxRadius * 2,
              }}
            >
              {/* Left half - white (owe) */}
              <div 
                className="absolute top-0 left-0 h-full w-1/2 bg-[var(--color-bg)]"
              />
              {/* Right half - black (owed) */}
              <div 
                className="absolute top-0 right-0 h-full w-1/2 bg-[var(--color-accent)]"
              />
            </div>
          )}

          {/* Normal state - nested circles */}
          {!isBalanced && whiteRadius >= blackRadius && (
            <>
              {/* White circle (larger) - what you owe */}
              {oweCount > 0 && (
                <div
                  className="bg-[var(--color-bg)] border-2 border-[var(--color-accent)] rounded-full absolute"
                  style={{
                    width: whiteRadius * 2,
                    height: whiteRadius * 2,
                  }}
                />
              )}
              {/* Black circle (smaller) - what you are owed - on top */}
              {owedCount > 0 && (
                <div
                  className="bg-[var(--color-accent)] rounded-full absolute"
                  style={{
                    width: blackRadius * 2,
                    height: blackRadius * 2,
                  }}
                />
              )}
            </>
          )}

          {!isBalanced && blackRadius > whiteRadius && (
            <>
              {/* Black circle (larger) - what you are owed */}
              {owedCount > 0 && (
                <div
                  className="bg-[var(--color-accent)] rounded-full absolute"
                  style={{
                    width: blackRadius * 2,
                    height: blackRadius * 2,
                  }}
                />
              )}
              {/* White circle (smaller) - what you owe - on top */}
              {oweCount > 0 && (
                <div
                  className="bg-[var(--color-bg)] border-2 border-[var(--color-accent)] rounded-full absolute"
                  style={{
                    width: whiteRadius * 2,
                    height: whiteRadius * 2,
                  }}
                />
              )}
            </>
          )}

          {/* Empty state */}
          {total === 0 && (
            <p className="text-[var(--color-text-muted)]">No IOUs yet</p>
          )}
        </div>
      </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 pb-8 shrink-0">
          <div className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] rounded">
            <span className="text-sm font-medium uppercase">Owe</span>
            <span className="text-sm font-medium">{oweCount}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg)] rounded">
            <span className="text-sm font-medium uppercase">Owed</span>
            <span className="text-sm font-medium">{owedCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

