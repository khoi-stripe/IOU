"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  phone: string;
  display_name: string;
}

interface IOU {
  id: string;
  from_user_id: string;
  to_phone: string;
  to_user_id: string | null;
  description: string;
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
  const [user, setUser] = useState<User | null>(null);
  const [owed, setOwed] = useState<IOU[]>([]);
  const [owing, setOwing] = useState<IOU[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("owe");
  const [filter, setFilter] = useState<Filter>("all");

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

  function copyShareLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    alert("Link copied!");
  }

  const items = activeTab === "owe" ? owed : owing;
  const filtered = items.filter((i) => {
    if (filter === "all") return true;
    return i.status === filter;
  });

  const oweCount = owed.filter((i) => i.status === "pending").length;
  const owedCount = owing.filter((i) => i.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-lg" style={{ letterSpacing: '0.1em' }}>👁️🅾️🐑</h1>
        <span className="text-sm font-medium">{user?.display_name}</span>
      </header>

      {/* Tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab("owe")}
          className={`flex-1 py-4 px-4 border text-left transition-colors ${
            activeTab === "owe"
              ? "border-[var(--color-accent)] bg-[var(--color-bg)]"
              : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Owe</span>
            <span className="text-sm font-bold">{oweCount}</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("owed")}
          className={`flex-1 py-4 px-4 border text-left transition-colors ${
            activeTab === "owed"
              ? "border-[var(--color-accent)] bg-[var(--color-bg)]"
              : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Owed</span>
            <span className="text-sm font-bold">{owedCount}</span>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 text-xs">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 border transition-colors ${
            filter === "all"
              ? "border-[var(--color-accent)] text-[var(--color-text)]"
              : "border-[var(--color-border)] text-[var(--color-text-muted)]"
          }`}
        >
          ALL
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-3 py-1.5 border transition-colors flex items-center gap-1.5 ${
            filter === "pending"
              ? "border-[var(--color-accent)] text-[var(--color-text)]"
              : "border-[var(--color-border)] text-[var(--color-text-muted)]"
          }`}
        >
          <span className="inline-block w-2.5 h-2.5 rounded-full border border-current" />
          PENDING
        </button>
        <button
          onClick={() => setFilter("repaid")}
          className={`px-3 py-1.5 border transition-colors flex items-center gap-1.5 ${
            filter === "repaid"
              ? "border-[var(--color-accent)] text-[var(--color-text)]"
              : "border-[var(--color-border)] text-[var(--color-text-muted)]"
          }`}
        >
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-current" />
          REPAID
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
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
              onShare={() => copyShareLink(iou.share_token)}
            />
          ))
        )}
      </div>

      {/* Fixed bottom button */}
      <Link
        href="/new"
        className="fixed bottom-0 left-0 right-0 m-4 py-4 bg-[var(--color-accent)] text-[var(--color-bg)] text-center text-sm font-bold rounded-full hover:opacity-90 transition-opacity"
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
    ? iou.to_user?.display_name || formatPhone(iou.to_phone)
    : iou.from_user?.display_name || "Someone";

  const isPending = iou.status === "pending";

  return (
    <div className="p-4 border border-[var(--color-border)] space-y-3">
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
        <p className="text-sm">
          {isOwe ? "You owe" : "Owes you"}{" "}
          <span className="font-bold">{personName}</span>
        </p>
        <p className="text-[var(--color-text-muted)] text-sm">{iou.description}</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onShare}
          className="flex-1 py-2.5 text-xs font-bold border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors uppercase tracking-wide"
        >
          Copy Link
        </button>
        {isPending && isOwe && (
          <button
            onClick={onMarkRepaid}
            className="flex-1 py-2.5 text-xs font-bold bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90 transition-opacity uppercase tracking-wide"
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
