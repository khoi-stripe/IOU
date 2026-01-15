"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Loader from "@/components/Loader";
import { useToast } from "@/components/Toast";

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

type Tab = "owe" | "owed";
type Filter = "all" | "pending" | "repaid";

export default function Dashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [owed, setOwed] = useState<IOU[]>([]);
  const [owing, setOwing] = useState<IOU[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("owe");
  const [filter, setFilter] = useState<Filter>("all");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/ious");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await res.json();
      setUser(data.user);
      setOwed(data.owed);
      setOwing(data.owing);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRepaid(id: string) {
    try {
      const res = await fetch(`/api/ious/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "repaid" }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleShare(iou: IOU, isOwe: boolean) {
    const personName = isOwe
      ? iou.to_user?.display_name || (iou.to_phone ? formatPhone(iou.to_phone) : "someone")
      : iou.from_user?.display_name || "Someone";

    const text = isOwe
      ? `I owe ${personName}${iou.description ? `: ${iou.description}` : ""}`
      : `${personName} owes me${iou.description ? `: ${iou.description}` : ""}`;

    const url = `${window.location.origin}/share/${iou.share_token}`;

    const shareData = {
      title: "IOU",
      text,
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
    <div className="flex flex-col h-full pt-4 pb-16">
      {/* Header */}
      <header className="flex items-center justify-between px-4 mb-4 shrink-0">
        <h1 className="text-lg" style={{ letterSpacing: '0.2em', filter: 'grayscale(1)' }}>👁️🅾️🐑</h1>
        <button 
          onClick={handleLogout}
          className="text-sm font-medium hover:underline underline-offset-4"
        >
          {user?.display_name} ↗
        </button>
      </header>

      {/* Tabs + Content Container */}
      <div className="flex flex-col flex-1 min-h-0 mb-2">
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
              className={`transition-colors flex items-center gap-1.5 pb-1 ${
                filter === "all"
                  ? "text-[var(--color-text)] border-b border-current"
                  : "text-[var(--color-text-muted)]"
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
              className={`transition-colors flex items-center gap-1.5 pb-1 ${
                filter === "pending"
                  ? "text-[var(--color-text)] border-b border-current"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-current" />
              PENDING
            </button>
            <button
              onClick={() => setFilter("repaid")}
              className={`transition-colors flex items-center gap-1.5 pb-1 ${
                filter === "repaid"
                  ? "text-[var(--color-text)] border-b border-current"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-current" />
              REPAID
            </button>
          </div>

          {/* List - scrollable */}
          <div className="space-y-3 p-4 overflow-y-auto flex-1 min-h-0">
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-[var(--color-text-muted)] text-sm">
                No IOUs yet
              </p>
            ) : (
              filtered.map((iou) => (
                <IOUCard
                  key={iou.id}
                  iou={iou}
                  isOwe={activeTab === "owe"}
                  onMarkRepaid={() => handleMarkRepaid(iou.id)}
                  onShare={() => handleShare(iou, activeTab === "owe")}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fixed bottom button */}
      <Link
        href="/new"
        className="fixed bottom-0 left-0 right-0 m-2 py-4 bg-[var(--color-accent)] text-[var(--color-bg)] text-center text-sm font-bold rounded-full hover:opacity-90 transition-opacity"
      >
        + NEW
      </Link>
    </div>
  );
}

function IOUCard({
  iou,
  isOwe,
  onMarkRepaid,
  onShare,
}: {
  iou: IOU;
  isOwe: boolean;
  onMarkRepaid: () => void;
  onShare: () => void;
}) {
  const personName = isOwe
    ? iou.to_user?.display_name || (iou.to_phone ? formatPhone(iou.to_phone) : null)
    : iou.from_user?.display_name || "Someone";

  const isPending = iou.status === "pending";

  return (
    <div className="p-4 bg-[var(--color-bg-secondary)] space-y-3 rounded-[4px]">
      {/* Top row: date + status */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">
          {new Date(iou.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <span
          className={`w-3 h-3 rounded-full border ${
            isPending
              ? "border-[var(--color-text-muted)] bg-transparent"
              : "border-[var(--color-text)] bg-[var(--color-text)]"
          }`}
        />
      </div>

      {/* Photo */}
      {iou.photo_url && (
        <img
          src={iou.photo_url}
          alt="IOU photo"
          className="w-full aspect-[4/3] object-cover"
        />
      )}

      {/* Content */}
      <div className="space-y-1">
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

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onShare}
          className="flex-1 px-2 py-1 text-xs font-bold bg-white text-black hover:opacity-80 transition-opacity uppercase rounded-full"
        >
          Share
        </button>
        {isPending && isOwe && (
          <button
            onClick={onMarkRepaid}
            className="flex-1 px-2 py-1 text-xs font-bold bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90 transition-opacity uppercase rounded-full"
          >
            Mark Repaid
          </button>
        )}
      </div>
    </div>
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
