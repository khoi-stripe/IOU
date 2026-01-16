"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from "react";

interface Toast {
  id: number;
  message: string;
  persistent?: boolean;
  onDismiss?: () => void;
  status?: "pending" | "repaid";
  isRevealed?: boolean; // For grow/fade animation when becoming top
}

interface ToastOptions {
  persistent?: boolean;
  onDismiss?: () => void;
  status?: "pending" | "repaid";
}

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => number;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (toast?.onDismiss) {
        toast.onDismiss();
      }
      const filtered = prev.filter((t) => t.id !== id);
      // Mark the new top toast as revealed for animation
      if (filtered.length > 0) {
        const lastIndex = filtered.length - 1;
        filtered[lastIndex] = { ...filtered[lastIndex], isRevealed: true };
      }
      return filtered;
    });
  }, []);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, persistent: options?.persistent, onDismiss: options?.onDismiss, status: options?.status }]);

    // Auto-dismiss after 3 seconds (unless persistent)
    if (!options?.persistent) {
      setTimeout(() => {
        dismissToast(id);
      }, 3000);
    }

    return id;
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed bottom-24 left-0 right-0 flex items-center justify-center z-50 px-4">
        {toasts.map((toast, index) => (
          <SwipeableToast
            key={toast.id}
            toast={toast}
            index={index}
            total={toasts.length}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function SwipeableToast({
  toast,
  index,
  total,
  onDismiss,
}: {
  toast: Toast;
  index: number;
  total: number;
  onDismiss: () => void;
}) {
  const touchStartX = useRef(0);
  const currentX = useRef(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const [swiping, setSwiping] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    currentX.current = 0;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    currentX.current = e.touches[0].clientX - touchStartX.current;
    if (elementRef.current) {
      elementRef.current.style.transform = `translateX(${currentX.current}px)`;
      elementRef.current.style.opacity = `${1 - Math.abs(currentX.current) / 200}`;
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    const threshold = 80;
    
    if (Math.abs(currentX.current) > threshold) {
      // Swipe out
      setDismissed(true);
      if (elementRef.current) {
        elementRef.current.style.transform = `translateX(${currentX.current > 0 ? 300 : -300}px)`;
        elementRef.current.style.opacity = "0";
      }
      setTimeout(onDismiss, 150);
    } else {
      // Snap back with lively bounce
      if (elementRef.current) {
        elementRef.current.style.transition = "transform 0.5s cubic-bezier(0.2, 1.8, 0.4, 1), opacity 0.2s";
        elementRef.current.style.transform = "translateX(0)";
        elementRef.current.style.opacity = "1";
        setTimeout(() => {
          if (elementRef.current) {
            elementRef.current.style.transition = "";
          }
        }, 500);
      }
    }
  };

  // Only show the top toast (last in array), others are completely hidden
  const isTop = index === total - 1;
  const shouldAnimate = isTop && (toast.isRevealed || total === 1);

  return (
    <div
      ref={elementRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`absolute bg-[var(--color-text)] text-[var(--color-bg)] px-4 py-2 text-xs font-medium rounded-[4px] select-none max-w-[280px] ${
        dismissed ? "" : shouldAnimate ? "animate-toast-reveal" : isTop ? "animate-toast-in" : ""
      }`}
      style={{
        touchAction: "pan-y",
        zIndex: index,
        visibility: isTop ? "visible" : "hidden",
      }}
    >
      <div className="flex items-start gap-2">
        {toast.status && (
          <span
            className={`shrink-0 w-2 h-2 rounded-full mt-0.5 ${
              toast.status === "repaid"
                ? "bg-[var(--color-bg)]"
                : "border border-[var(--color-bg)] bg-transparent"
            }`}
          />
        )}
        {total > 1 && <span className="shrink-0 opacity-60">{index + 1}/{total}</span>}
        <span className="line-clamp-2">{toast.message}</span>
      </div>
    </div>
  );
}
