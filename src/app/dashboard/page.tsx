"use client";

import { useEffect, useState, useRef, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Loader from "@/components/Loader";
import Logo from "@/components/Logo";
import { useToast } from "@/components/Toast";
import ImageWithLoader from "@/components/ImageWithLoader";
import BalanceModal from "@/components/BalanceModal";

const PAGE_SIZE = 10;

interface User {
  id: string;
  phone: string;
  display_name: string;
}

interface IOU {
  id: string;
  from_user_id: string;
  to_phone: string | null;
  to_user_id: string | null;
  description: string | null;
  photo_url: string | null;
  status: "pending" | "repaid";
  share_token: string;
  created_at: string;
  repaid_at: string | null;
  from_user?: User;
  to_user?: User;
}

interface Notification {
  id: string;
  user_id: string;
  iou_id: string;
  type: "repaid" | "new_iou";
  message: string;
  created_at: string;
  acknowledged_at: string | null;
}

type Tab = "owe" | "owed";
type Filter = "all" | "pending" | "repaid";

export default function Dashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [owed, setOwed] = useState<IOU[]>([]);
  const [owing, setOwing] = useState<IOU[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreOwed, setHasMoreOwed] = useState(false);
  const [hasMoreOwing, setHasMoreOwing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("owe");
  const [filter, setFilter] = useState<Filter>("all");
  const [showBalance, setShowBalance] = useState(false);
  const [collapsingId, setCollapsingId] = useState<string | null>(null);
  const [pendingNotifications, setPendingNotifications] = useState<Notification[]>([]);
  const notificationsShownRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  // Fetch notifications on mount (store them, show after IOUs load)
  useEffect(() => {
    async function fetchNotifications() {
      if (notificationsShownRef.current) return;
      notificationsShownRef.current = true;

      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        
        const { notifications } = await res.json() as { notifications: Notification[] };
        setPendingNotifications(notifications);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    }

    fetchNotifications();
  }, []);

  const fetchData = useCallback(async (append = false) => {
    try {
      const offset = append ? (activeTab === "owe" ? owed.length : owing.length) : 0;
      const res = await fetch(`/api/ious?limit=${PAGE_SIZE}&offset=${offset}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await res.json();
      setUser(data.user);
      
      if (append) {
        setOwed(prev => [...prev, ...data.owed]);
        setOwing(prev => [...prev, ...data.owing]);
      } else {
        setOwed(data.owed);
        setOwing(data.owing);
      }
      
      setHasMoreOwed(data.hasMoreOwed);
      setHasMoreOwing(data.hasMoreOwing);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeTab, owed.length, owing.length, router]);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show notifications as toasts once IOUs are loaded
  useEffect(() => {
    if (loading || pendingNotifications.length === 0) return;
    
    for (const notification of pendingNotifications) {
      showToast(notification.message, {
        persistent: true,
        status: notification.type === "repaid" ? "repaid" : "pending",
        onDismiss: async () => {
          await fetch("/api/notifications/acknowledge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: notification.id }),
          });
        },
      });
    }
    
    // Clear pending notifications after showing
    setPendingNotifications([]);
  }, [loading, pendingNotifications, showToast]);

  const loadMore = useCallback(() => {
    const hasMore = activeTab === "owe" ? hasMoreOwed : hasMoreOwing;
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    fetchData(true);
  }, [activeTab, hasMoreOwed, hasMoreOwing, loadingMore, fetchData]);

  // Scroll detection for infinite scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Load more when within 200px of bottom
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMore();
      }
    }

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  async function handleMarkRepaid(id: string) {
    // Start collapse animation immediately (optimistic)
    setCollapsingId(id);
    
    // Update locally after animation completes (250ms to match CSS)
    setTimeout(() => {
      setOwed(prev => prev.map(iou => 
        iou.id === id ? { ...iou, status: "repaid" as const, repaid_at: new Date().toISOString() } : iou
      ));
      setOwing(prev => prev.map(iou => 
        iou.id === id ? { ...iou, status: "repaid" as const, repaid_at: new Date().toISOString() } : iou
      ));
      setCollapsingId(null);
    }, 250);
    
    // API call in background
    try {
      await fetch(`/api/ious/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "repaid" }),
      });
    } catch (err) {
      console.error(err);
      // Could revert optimistic update here if needed
    }
  }

  async function handleShare(iou: IOU) {
    const url = `${window.location.origin}/share/${iou.share_token}`;

    const shareData = {
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        showToast("Link copied!");
      }
    } catch (err) {
      // User cancelled share or error - silently ignore
      if (err instanceof Error && err.name !== "AbortError") {
        await navigator.clipboard.writeText(url);
        showToast("Link copied!");
      }
    }
  }

  const items = activeTab === "owe" ? owed : owing;
  const filtered = items.filter((i) => {
    if (filter === "all") return true;
    return i.status === filter;
  });

  const oweCount = owed.filter((i) => i.status === "pending").length;
  const owedCount = owing.filter((i) => i.status === "pending").length;

  if (loading) {
    return <Loader className="h-dvh" />;
  }

  return (
    <div className="flex flex-col h-full pt-4 pb-20">
      {/* Balance Modal */}
      {showBalance && (
        <BalanceModal
          oweCount={owed.filter(i => i.status === "pending").length}
          owedCount={owing.filter(i => i.status === "pending").length}
          oweRepaidCount={owed.filter(i => i.status === "repaid").length}
          owedRepaidCount={owing.filter(i => i.status === "repaid").length}
          onClose={() => setShowBalance(false)}
        />
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 mb-4 shrink-0">
        <button onClick={() => setShowBalance(true)} className="text-lg hover:opacity-60 transition-opacity">
          <Logo />
        </button>
        <button 
          onClick={handleLogout}
          className="text-sm font-medium hover:underline underline-offset-4"
        >
          {user?.display_name} ↗
        </button>
      </header>

      {/* Tabs + Content Container */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Tabs */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("owe")}
            className={`flex-1 py-4 px-4 text-left transition-colors rounded-t ${
              activeTab === "owe"
                ? "border-t border-l border-r border-[#808080] bg-[var(--color-bg)] relative z-10"
                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]"
            }`}
            style={activeTab === "owe" ? { marginBottom: "-1px" } : {}}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Owe</span>
              <span className="text-sm font-medium">{oweCount}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("owed")}
            className={`flex-1 py-4 px-4 text-left transition-colors rounded-t ${
              activeTab === "owed"
                ? "border-t border-l border-r border-[#808080] bg-[var(--color-bg)] relative z-10"
                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]"
            }`}
            style={activeTab === "owed" ? { marginBottom: "-1px" } : {}}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Owed</span>
              <span className="text-sm font-medium">{owedCount}</span>
            </div>
          </button>
        </div>

        {/* Content Container */}
        <div className="border border-[#808080] flex flex-col flex-1 min-h-0 rounded-b">
          {/* Filters */}
          <div className="flex gap-3 text-xs pt-4 px-4 bg-[var(--color-bg)] shrink-0">
            <button
              onClick={() => setFilter("all")}
              className={`transition-colors flex items-center gap-1.5 pb-1 text-[var(--color-text)] ${
                filter === "all" ? "border-b border-current" : ""
              }`}
            >
              <span 
                className="inline-block w-2.5 h-2.5 rounded-full border border-current"
                style={{ background: "linear-gradient(to right, currentColor 50%, transparent 50%)" }}
              />
              ALL
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`transition-colors flex items-center gap-1.5 pb-1 text-[var(--color-text)] ${
                filter === "pending" ? "border-b border-current" : ""
              }`}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-current" />
              OUTSTANDING
            </button>
            <button
              onClick={() => setFilter("repaid")}
              className={`transition-colors flex items-center gap-1.5 pb-1 text-[var(--color-text)] ${
                filter === "repaid" ? "border-b border-current" : ""
              }`}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-current" />
              REPAID
            </button>
          </div>

          {/* List - scrollable */}
          <div ref={scrollContainerRef} className="space-y-3 p-4 overflow-y-auto flex-1 min-h-0">
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-[var(--color-text-muted)] text-sm">
                No IOUs yet
              </p>
            ) : (
              <>
                {filtered.map((iou) => (
                  <IOUCard
                    key={iou.id}
                    iou={iou}
                    isOwe={activeTab === "owe"}
                    isCollapsing={collapsingId === iou.id}
                    onMarkRepaid={() => handleMarkRepaid(iou.id)}
                    onShare={() => handleShare(iou)}
                  />
                ))}
                {loadingMore && (
                  <div className="py-4 text-center">
                    <span className="text-sm text-[var(--color-text-muted)]">Loading...</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fixed bottom button */}
      <Link
        href="/new"
        className="fixed bottom-0 left-0 right-0 mx-2 mt-2 mb-4 py-4 bg-[var(--color-accent)] text-[var(--color-bg)] text-center text-sm font-bold rounded-full hover:opacity-90 transition-opacity"
      >
        + NEW
      </Link>
    </div>
  );
}

const IOUCard = memo(function IOUCard({
  iou,
  isOwe,
  isCollapsing,
  onMarkRepaid,
  onShare,
}: {
  iou: IOU;
  isOwe: boolean;
  isCollapsing?: boolean;
  onMarkRepaid: () => void;
  onShare: () => void;
}) {
  const personName = isOwe
    ? iou.to_user?.display_name || (iou.to_phone ? formatPhone(iou.to_phone) : null)
    : iou.from_user?.display_name || "Someone";

  const isPending = iou.status === "pending";

  return (
    <div className="p-4 bg-[var(--color-bg-secondary)] rounded-[4px]">
      {/* Top row: status + date + share icon */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Status circle */}
          <span
            className={`w-2.5 h-2.5 rounded-full border ${
              isPending
                ? "border-[var(--color-text-muted)] bg-transparent"
                : "border-[var(--color-text)] bg-[var(--color-text)]"
            }`}
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            {new Date(iou.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Share icon */}
        <button
          onClick={onShare}
          className="p-1 hover:opacity-60 transition-opacity text-[var(--color-text-muted)]"
          aria-label="Share"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div>
        {personName && (
          <p className="text-sm">
            {isOwe ? (
              <>You owe <span className="font-bold">{personName}</span></>
            ) : (
              <><span className="font-bold">{personName}</span> owes you</>
            )}
          </p>
        )}
        {iou.description && (
          <p className="text-[var(--color-text-muted)] text-sm">{iou.description}</p>
        )}
        {!personName && !iou.description && (
          <p className="text-[var(--color-text-muted)] text-sm italic">No details yet</p>
        )}
      </div>

      {/* Photo */}
      {iou.photo_url && (
        <ImageWithLoader
          src={iou.photo_url}
          alt="IOU photo"
          className="w-full aspect-[4/3] mt-3"
        />
      )}

      {/* Mark Repaid button - uses mt-3 instead of space-y for controlled collapse */}
      {isPending && (
        <div className={`mt-3 ${isCollapsing ? "animate-button-collapse" : ""}`}>
          <HoldToConfirmButton onConfirm={onMarkRepaid} label="Hold to Mark Repaid" duration={1200} />
        </div>
      )}
    </div>
  );
});

function HoldToConfirmButton({
  onConfirm,
  label,
  duration = 1500,
}: {
  onConfirm: () => void;
  label: string;
  duration?: number;
}) {
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
    e.preventDefault();
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
          Repaid ✓
        </span>
      )}
    </button>
  );
}

function formatPhone(phone: string): string {
  if (phone.length === 10) {
    return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
  }
  if (phone.length === 11 && phone.startsWith("1")) {
    return `(${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}`;
  }
  return phone;
}
