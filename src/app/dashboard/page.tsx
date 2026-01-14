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

type Tab = "owed" | "owing";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [owed, setOwed] = useState<IOU[]>([]);
  const [owing, setOwing] = useState<IOU[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("owed");
  const [filter, setFilter] = useState<"all" | "pending" | "repaid">("all");

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
    alert("Link copied to clipboard!");
  }

  const items = activeTab === "owed" ? owed : owing;
  const filtered = items.filter((i) => {
    if (filter === "all") return true;
    return i.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ letterSpacing: '0.3em' }}>👁️🅾️🐑</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {user?.display_name}
        </p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab("owed")}
          className={`flex-1 py-2 text-sm border-b-2 transition-colors ${
            activeTab === "owed"
              ? "border-[var(--color-accent)] text-[var(--color-text)]"
              : "border-transparent text-[var(--color-text-muted)]"
          }`}
        >
          I Owe ({owed.filter((i) => i.status === "pending").length})
        </button>
        <button
          onClick={() => setActiveTab("owing")}
          className={`flex-1 py-2 text-sm border-b-2 transition-colors ${
            activeTab === "owing"
              ? "border-[var(--color-accent)] text-[var(--color-text)]"
              : "border-transparent text-[var(--color-text-muted)]"
          }`}
        >
          Owed to Me ({owing.filter((i) => i.status === "pending").length})
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 text-xs">
        {(["all", "pending", "repaid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-1 border transition-colors ${
              filter === f
                ? "border-[var(--color-accent)] text-[var(--color-text)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-[var(--color-text-muted)] text-sm">
            No IOUs yet
          </p>
        ) : (
          filtered.map((iou) => (
            <IOUCard
              key={iou.id}
              iou={iou}
              isOwed={activeTab === "owed"}
              onMarkRepaid={() => handleMarkRepaid(iou.id)}
              onShare={() => copyShareLink(iou.share_token)}
            />
          ))
        )}
      </div>

      {/* Fixed bottom button */}
      <Link
        href="/new"
        className="fixed bottom-0 left-0 right-0 m-2 py-3 bg-[var(--color-accent)] text-[var(--color-bg)] text-center text-sm font-bold hover:opacity-80 transition-opacity"
      >
        + New
      </Link>
    </div>
  );
}

function IOUCard({
  iou,
  isOwed,
  onMarkRepaid,
  onShare,
}: {
  iou: IOU;
  isOwed: boolean;
  onMarkRepaid: () => void;
  onShare: () => void;
}) {
  const personName = isOwed
    ? iou.to_user?.display_name || formatPhone(iou.to_phone)
    : iou.from_user?.display_name || "Someone";

  return (
    <div className="p-4 border border-[var(--color-border)] space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-sm">
            {isOwed ? "You owe" : "Owes you"}{" "}
            <span className="font-bold">{personName}</span>
          </p>
          <p className="text-[var(--color-text-muted)]">{iou.description}</p>
        </div>
        <span
          className={`text-xs px-2 py-1 ${
            iou.status === "pending"
              ? "bg-[var(--color-bg-secondary)]"
              : "bg-[var(--color-accent)] text-[var(--color-bg)]"
          }`}
        >
          {iou.status}
        </span>
      </div>

      {iou.photo_url && (
        <img
          src={iou.photo_url}
          alt="IOU photo"
          className="w-full h-32 object-cover border border-[var(--color-border)]"
        />
      )}

      <div className="flex gap-2 text-xs">
        <button
          onClick={onShare}
          className="px-3 py-1 border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
        >
          Copy Link
        </button>
        {iou.status === "pending" && isOwed && (
          <button
            onClick={onMarkRepaid}
            className="px-3 py-1 border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
          >
            Mark Repaid
          </button>
        )}
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        {new Date(iou.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}

function formatPhone(phone: string): string {
  if (phone.length === 10) {
    return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
  }
  return phone;
}

