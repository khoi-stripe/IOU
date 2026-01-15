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

  // Check if it's a 1:1 ratio
  const isBalanced = oweCount > 0 && owedCount > 0 && oweCount === owedCount;
  
  // Determine which side is dominant and calculate hole size
  // The hole represents what "cancels out"
  const oweMore = oweCount > owedCount;
  const owedMore = owedCount > oweCount;
  
  // Hole is proportional to the smaller count / larger count
  let holeRadius = 0;
  if (oweMore && owedCount > 0) {
    holeRadius = (owedCount / oweCount) * maxRadius;
  } else if (owedMore && oweCount > 0) {
    holeRadius = (oweCount / owedCount) * maxRadius;
  }
  
  // Ensure minimum hole size if there's something to show
  if (holeRadius > 0 && holeRadius < 20) holeRadius = 20;

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
              className="rounded-full overflow-hidden border-2 border-[var(--color-accent)] relative flex"
              style={{
                width: maxRadius * 2,
                height: maxRadius * 2,
              }}
            >
              {/* Left half - white (owe) */}
              <div className="w-1/2 h-full bg-[var(--color-bg)]" />
              {/* Right half - black (owed) */}
              <div className="w-1/2 h-full bg-[var(--color-accent)]" />
            </div>
          )}

          {/* You owe more - white circle with black hole */}
          {!isBalanced && oweMore && (
            <>
              {/* Outer white circle */}
              <div
                className="bg-[var(--color-bg)] border-2 border-[var(--color-accent)] rounded-full absolute"
                style={{
                  width: maxRadius * 2,
                  height: maxRadius * 2,
                }}
              />
              {/* Black hole (what cancels out) */}
              {holeRadius > 0 && (
                <div
                  className="bg-[var(--color-accent)] rounded-full absolute"
                  style={{
                    width: holeRadius * 2,
                    height: holeRadius * 2,
                  }}
                />
              )}
            </>
          )}

          {/* You are owed more - black circle with white hole */}
          {!isBalanced && owedMore && (
            <>
              {/* Outer black circle */}
              <div
                className="bg-[var(--color-accent)] rounded-full absolute"
                style={{
                  width: maxRadius * 2,
                  height: maxRadius * 2,
                }}
              />
              {/* White hole (what cancels out) */}
              {holeRadius > 0 && (
                <div
                  className="bg-[var(--color-bg)] border-2 border-[var(--color-accent)] rounded-full absolute"
                  style={{
                    width: holeRadius * 2,
                    height: holeRadius * 2,
                  }}
                />
              )}
            </>
          )}
          
          {/* Only one side has IOUs - solid circle, no hole */}
          {!isBalanced && oweCount > 0 && owedCount === 0 && (
            <div
              className="bg-[var(--color-bg)] border-2 border-[var(--color-accent)] rounded-full absolute"
              style={{
                width: maxRadius * 2,
                height: maxRadius * 2,
              }}
            />
          )}
          
          {!isBalanced && owedCount > 0 && oweCount === 0 && (
            <div
              className="bg-[var(--color-accent)] rounded-full absolute"
              style={{
                width: maxRadius * 2,
                height: maxRadius * 2,
              }}
            />
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

