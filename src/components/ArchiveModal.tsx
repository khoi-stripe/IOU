"use client";

import { useEffect, useState, useCallback } from "react";
import Logo from "./Logo";
import ImageWithLoader from "./ImageWithLoader";

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

export default function ArchiveModal({ userId, onClose, onUnarchive }: ArchiveModalProps) {
  const [ious, setIous] = useState<IOU[]>([]);
  const [loading, setLoading] = useState(true);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Fetch archived IOUs
  useEffect(() => {
    async function fetchArchived() {
      try {
        const res = await fetch("/api/ious/archived");
        if (res.ok) {
          const data = await res.json();
          setIous(data.ious || []);
        }
      } catch (err) {
        console.error("Failed to fetch archived IOUs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchArchived();
  }, []);

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
    setIous(prev => prev.filter(iou => iou.id !== iouId));
    // Call parent handler
    onUnarchive(iouId);
  }

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex justify-center">
      <div className="flex flex-col w-full max-w-md px-2 h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-4 shrink-0">
          <div className="text-lg -mt-[9px]">
            <Logo /> archive
          </div>
          <button
            onClick={handleClose}
            className="text-2xl font-bold w-10 h-10 flex items-center justify-center hover:opacity-60 transition-opacity"
          >
            ×
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-[var(--color-text-muted)]">Loading...</p>
            </div>
          ) : ious.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-[var(--color-text-muted)]">No archived IOUs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ious.map((iou) => {
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
                    <button
                      onClick={() => handleUnarchiveClick(iou.id)}
                      className="mt-3 w-full py-2 text-sm border border-[var(--color-border)] rounded-full hover:border-[var(--color-accent)] transition-colors"
                    >
                      Unarchive
                    </button>
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


