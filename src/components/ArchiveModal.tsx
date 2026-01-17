"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Logo from "./Logo";
import ImageWithLoader from "./ImageWithLoader";
import HoldToConfirmButton from "./HoldToConfirmButton";
import ButtonLoader from "./ButtonLoader";

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
  to_name: string | null;
  description: string | null;
  photo_url: string | null;
  status: "pending" | "repaid";
  share_token: string;
  created_at: string;
  repaid_at: string | null;
  from_user?: User;
  to_user?: User;
}

interface ArchiveModalProps {
  userId: string;
  onClose: () => void;
  onUnarchive: (iouId: string) => void;
}

type Filter = "all" | "pending" | "repaid";

export default function ArchiveModal({ userId, onClose, onUnarchive }: ArchiveModalProps) {
  const [ious, setIous] = useState<IOU[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(onClose, 300);
  }, [onClose]);

  // Fetch archived IOUs
  useEffect(() => {
    const cacheKey = `iou:archive:${userId}`;

    async function fetchArchived() {
      try {
        // Load cached archive immediately (fast UI), then refresh in background
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached) as { ts: number; ious: IOU[] };
            if (parsed?.ts && Array.isArray(parsed.ious) && Date.now() - parsed.ts < 5 * 60 * 1000) {
              setIous(parsed.ious);
              setLoading(false);
            }
          }
        } catch {
          // ignore cache parse errors
        }

        const res = await fetch("/api/ious/archived");
        if (res.ok) {
          const data = await res.json();
          const next = (data.ious || []) as IOU[];
          setIous(next);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), ious: next }));
          } catch {
            // ignore storage errors
          }
        }
      } catch (err) {
        console.error("Failed to fetch archived IOUs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchArchived();
  }, [userId]);

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

  function formatPhone(phone: string): string {
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    if (phone.length === 11 && phone.startsWith("1")) {
      return `(${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}`;
    }
    return phone;
  }

  async function handleUnarchiveClick(iouId: string) {
    // Remove from local state
    setIous((prev) => {
      const next = prev.filter((iou) => iou.id !== iouId);
      try {
        sessionStorage.setItem(`iou:archive:${userId}`, JSON.stringify({ ts: Date.now(), ious: next }));
      } catch {
        // ignore storage errors
      }
      return next;
    });
    // Call parent handler
    onUnarchive(iouId);
  }

  const filteredIOUs = useMemo(() => {
    if (filter === "all") return ious;
    return ious.filter((i) => i.status === filter);
  }, [ious, filter]);

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex justify-center">
      <div className="flex flex-col w-full max-w-md px-2 h-full">
        {/* Header */}
        <header className={`flex items-center justify-between px-4 pt-4 shrink-0 transition-opacity duration-300 ${isClosing ? "opacity-0" : ""}`}>
          <div className="text-lg -mt-[5px]">
            <Logo /> <span className="animate-logo-text relative top-[2px]">archive</span>
          </div>
          <button
            onClick={handleClose}
            className="text-2xl font-bold w-10 h-10 flex items-center justify-center hover:opacity-60 transition-opacity -mt-[7px] -mr-[9px]"
          >
            ×
          </button>
        </header>

        {/* Filters */}
        <div className={`flex gap-3 text-xs px-4 pt-4 transition-opacity duration-300 ${isClosing ? "opacity-0" : ""}`}>
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

        {/* Content */}
        <div className={`flex-1 overflow-y-auto px-4 py-4 transition-opacity duration-300 ${isClosing ? "opacity-0" : ""}`}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <span className="text-[var(--color-text-muted)]"><ButtonLoader /></span>
            </div>
          ) : filteredIOUs.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-[var(--color-text-muted)]">
                {ious.length === 0 ? "No archived IOUs" : "No matching IOUs"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIOUs.map((iou) => {
                const isOwe = iou.from_user_id === userId;
                const personName = isOwe
                  ? iou.to_user?.display_name || iou.to_name || (iou.to_phone ? formatPhone(iou.to_phone) : null)
                  : iou.from_user?.display_name || "Someone";
                const isPending = iou.status === "pending";

                return (
                  <div key={iou.id} className="p-4 bg-[var(--color-bg-secondary)] rounded-[4px]">
                    {/* Top row: status + date */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
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
                    </div>

                    {/* Photo */}
                    {iou.photo_url && (
                      <ImageWithLoader
                        src={iou.photo_url}
                        alt="IOU photo"
                        className="w-full aspect-[4/3] mt-3"
                      />
                    )}

                    {/* Unarchive button */}
                    <div className="mt-3">
                      <HoldToConfirmButton
                        onConfirm={() => handleUnarchiveClick(iou.id)}
                        label="Hold to Unarchive"
                        confirmedLabel="Unarchived ✓"
                        duration={1200}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


