"use client";

import { useState, useRef, useEffect } from "react";

interface HoldToConfirmButtonProps {
  onConfirm: () => void;
  label: string;
  confirmedLabel?: string;
  duration?: number;
}

export default function HoldToConfirmButton({
  onConfirm,
  label,
  confirmedLabel = "Done ✓",
  duration = 1500,
}: HoldToConfirmButtonProps) {
  const [progress, setProgress] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const holdingRef = useRef(false);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const confirmedRef = useRef(false);
  const velocityRef = useRef(0);
  const progressRef = useRef(0);

  const animateFill = () => {
    if (!holdingRef.current) return;
    
    const elapsed = Date.now() - startTimeRef.current;
    const newProgress = Math.min((elapsed / duration) * 100, 100);
    progressRef.current = newProgress;
    setProgress(newProgress);
    
    if (newProgress >= 100 && !confirmedRef.current) {
      confirmedRef.current = true;
      holdingRef.current = false;
      setConfirmed(true);
      // Start exit animation after iris completes, call onConfirm immediately for smooth transition
      setTimeout(() => {
        setExiting(true);
        onConfirm();
      }, 500);
      return;
    }
    
    rafRef.current = requestAnimationFrame(animateFill);
  };

  const animateSpringBack = () => {
    // Spring physics (toned down)
    const stiffness = 0.08;
    const damping = 0.85;
    const target = 0;
    
    const displacement = progressRef.current - target;
    const springForce = -stiffness * displacement;
    velocityRef.current = (velocityRef.current + springForce) * damping;
    progressRef.current += velocityRef.current;
    
    // Stop when settled
    if (Math.abs(progressRef.current) < 0.5 && Math.abs(velocityRef.current) < 0.1) {
      progressRef.current = 0;
      setProgress(0);
      return;
    }
    
    setProgress(Math.max(0, progressRef.current));
    rafRef.current = requestAnimationFrame(animateSpringBack);
  };

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    // Only preventDefault for mouse events - touch is handled by touch-none CSS
    if (e.type === "mousedown") {
      e.preventDefault();
    }
    if (holdingRef.current) return;
    
    // Cancel any spring animation
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    holdingRef.current = true;
    confirmedRef.current = false;
    velocityRef.current = 0;
    startTimeRef.current = Date.now() - (progressRef.current / 100 * duration); // Resume from current progress
    rafRef.current = requestAnimationFrame(animateFill);
  };

  const stopHold = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    if (!confirmedRef.current && progressRef.current > 0) {
      // Spring back to zero
      velocityRef.current = 0;
      rafRef.current = requestAnimationFrame(animateSpringBack);
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <button
      onMouseDown={!confirmed ? startHold : undefined}
      onMouseUp={!confirmed ? stopHold : undefined}
      onMouseLeave={!confirmed ? stopHold : undefined}
      onTouchStart={!confirmed ? startHold : undefined}
      onTouchEnd={!confirmed ? stopHold : undefined}
      onTouchCancel={!confirmed ? stopHold : undefined}
      className={`relative w-full py-2 text-xs font-bold uppercase rounded-full overflow-hidden border border-[var(--color-accent)] select-none touch-none ${
        exiting ? "animate-button-exit" : ""
      }`}
    >
      {/* Base label (accent text) */}
      <span className={`transition-opacity duration-200 ${confirmed ? "opacity-0" : "text-[var(--color-accent)]"}`}>
        {label}
      </span>
      
      {/* Fill with rounded right edge */}
      <div 
        className="absolute top-0 left-0 bottom-0 bg-[var(--color-accent)] rounded-full transition-opacity duration-200"
        style={{ 
          width: confirmed ? "100%" : `${progress}%`,
          opacity: confirmed ? 0 : 1,
        }}
      />
      
      {/* Inverted text layer, clipped by progress */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-200"
        style={{ 
          clipPath: `inset(0 ${100 - progress}% 0 0)`,
          opacity: confirmed ? 0 : 1,
        }}
      >
        <span className="text-[var(--color-bg)]">
          {label}
        </span>
      </div>
      
      {/* Confirmed state - black background */}
      {confirmed && (
        <div className="absolute inset-0 bg-[var(--color-accent)]" />
      )}
      
      {/* Iris wipe - white circle expanding from center */}
      {confirmed && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="absolute bg-[var(--color-bg)] rounded-full animate-iris-expand" />
        </div>
      )}
      
      {/* Confirmed text - revealed by iris */}
      {confirmed && (
        <span className="absolute inset-0 flex items-center justify-center text-[var(--color-accent)] z-10">
          {confirmedLabel}
        </span>
      )}
    </button>
  );
}

