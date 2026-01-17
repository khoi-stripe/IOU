"use client";

import { useEffect, useState, useCallback } from "react";
import Logo from "./Logo";

interface BalanceModalProps {
  oweCount: number;        // outstanding owe
  owedCount: number;       // outstanding owed
  oweRepaidCount: number;  // repaid owe
  owedRepaidCount: number; // repaid owed
  onClose: () => void;
}

export default function BalanceModal({ oweCount, owedCount, oweRepaidCount, owedRepaidCount, onClose }: BalanceModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(onClose, 500);
  }, [onClose]);

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
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  const total = oweCount + owedCount;
  const maxRadius = 150; // max radius in pixels

  // Check if it's a 1:1 ratio
  const isBalanced = oweCount > 0 && owedCount > 0 && oweCount === owedCount;
  
  // Determine which side is dominant and calculate hole size
  // The hole's AREA should be proportional to the smaller count
  // Since area = πr², we need: holeArea/totalArea = smallerCount/total
  // So: r²/R² = smallerCount/total → r = R * sqrt(smallerCount/total)
  const oweMore = oweCount > owedCount;
  const owedMore = owedCount > oweCount;
  
  let holeRadius = 0;
  if (oweMore && owedCount > 0) {
    // White outer (owe), black hole (owed)
    // Black hole area should be owedCount/total of the total area
    holeRadius = maxRadius * Math.sqrt(owedCount / total);
  } else if (owedMore && oweCount > 0) {
    // Black outer (owed), white hole (owe)
    // White hole area should be oweCount/total of the total area
    holeRadius = maxRadius * Math.sqrt(oweCount / total);
  }
  
  // Ensure minimum hole size if there's something to show
  if (holeRadius > 0 && holeRadius < 20) holeRadius = 20;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex justify-center">
      <div className="flex flex-col w-full max-w-md px-2">
        {/* Header */}
        <header className={`flex items-center justify-between px-4 pt-4 shrink-0 transition-opacity duration-300 ${isClosing ? "opacity-0" : ""}`}>
          <div className="text-lg -mt-[7px]">
            <Logo /> <span className="animate-logo-text">balance</span>
          </div>
          <button
            onClick={handleClose}
            className="text-2xl font-bold w-10 h-10 flex items-center justify-center hover:opacity-60 transition-opacity -mt-[7px] -mr-[9px]"
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
              className={`rounded-full overflow-hidden border-2 border-[var(--color-accent)] relative flex ${isClosing ? "animate-circle-outer-out" : "animate-circle-outer"}`}
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
                className={`bg-[var(--color-bg)] border-2 border-[var(--color-accent)] rounded-full ${isClosing ? "animate-circle-outer-out" : "animate-circle-outer"}`}
                style={{
                  width: maxRadius * 2,
                  height: maxRadius * 2,
                }}
              />
              {/* Black hole (what cancels out) */}
              {holeRadius > 0 && (
                <div
                  className={`bg-[var(--color-accent)] rounded-full absolute ${isClosing ? "animate-circle-inner-out" : "animate-circle-inner"}`}
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
                className={`bg-[var(--color-accent)] rounded-full ${isClosing ? "animate-circle-outer-out" : "animate-circle-outer"}`}
                style={{
                  width: maxRadius * 2,
                  height: maxRadius * 2,
                }}
              />
              {/* White hole (what cancels out) */}
              {holeRadius > 0 && (
                <div
                  className={`bg-[var(--color-bg)] border-2 border-[var(--color-accent)] rounded-full absolute ${isClosing ? "animate-circle-inner-out" : "animate-circle-inner"}`}
                  style={{
                    width: holeRadius * 2,
                    height: holeRadius * 2,
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
        <div className={`pb-14 shrink-0 px-4 transition-opacity duration-300 ${isClosing ? "opacity-0" : ""}`}>
          {/* Header row */}
          <div className="grid grid-cols-4 gap-2 mb-2 text-xs text-[var(--color-text-muted)] uppercase">
            <div></div>
            <div className="text-center">Outstanding</div>
            <div className="text-center">Repaid</div>
            <div className="text-center">Total</div>
          </div>
          {/* Owe row */}
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full border border-[var(--color-accent)] bg-[var(--color-bg)] mr-2" />
              <span className="text-sm font-medium uppercase">Owe</span>
            </div>
            <div className="text-center text-sm font-medium">{oweCount}</div>
            <div className="text-center text-sm text-[var(--color-text-muted)]">{oweRepaidCount}</div>
            <div className="text-center text-sm font-medium">{oweCount + oweRepaidCount}</div>
          </div>
          {/* Owed row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-[var(--color-accent)] mr-2" />
              <span className="text-sm font-medium uppercase">Owed</span>
            </div>
            <div className="text-center text-sm font-medium">{owedCount}</div>
            <div className="text-center text-sm text-[var(--color-text-muted)]">{owedRepaidCount}</div>
            <div className="text-center text-sm font-medium">{owedCount + owedRepaidCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

