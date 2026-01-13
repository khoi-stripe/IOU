"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  phone: string;
  displayName: string;
}

interface IOU {
  id: string;
  fromUserId: string;
  toPhone: string;
  toUserId: string | null;
  description: string;
  photoUrl: string | null;
  status: "pending" | "repaid";
  shareToken: string;
  createdAt: string;
  repaidAt: string | null;
  fromUser?: User;
  toUser?: User;
}

export default function IOUDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [iou, setIou] = useState<IOU | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchIOU() {
      try {
        const res = await fetch(`/api/ious/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("IOU not found");
            return;
          }
          throw new Error("Failed to fetch");
        }
        const data = await res.json();
        setIou(data.iou);
      } catch {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchIOU();
    }
  }, [id]);

  async function handleMarkRepaid() {
    try {
      const res = await fetch(`/api/ious/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "repaid" }),
      });
      if (res.ok) {
        const data = await res.json();
        setIou(data.iou);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function copyShareLink() {
    if (!iou) return;
    const url = `${window.location.origin}/share/${iou.shareToken}`;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    );
  }

  if (error || !iou) {
    return (
      <div className="space-y-6 text-center py-12">
        <p className="text-[var(--color-text-muted)]">
          {error || "IOU not found"}
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 border border-[var(--color-border)]"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const toName = iou.toUser?.displayName || formatPhone(iou.toPhone);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          ← Back
        </Link>
        <span
          className={`text-xs px-2 py-1 ${
            iou.status === "pending"
              ? "bg-[var(--color-bg-secondary)]"
              : "bg-[var(--color-accent)] text-[var(--color-bg)]"
          }`}
        >
          {iou.status}
        </span>
      </header>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-[var(--color-text-muted)]">You owe</p>
          <p className="text-xl font-bold">{toName}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-[var(--color-text-muted)]">For</p>
          <p className="text-lg">{iou.description}</p>
        </div>

        {iou.photoUrl && (
          <img
            src={iou.photoUrl}
            alt="IOU photo"
            className="w-full h-64 object-cover border border-[var(--color-border)]"
          />
        )}

        <div className="text-sm text-[var(--color-text-muted)]">
          <p>Created: {new Date(iou.createdAt).toLocaleDateString()}</p>
          {iou.repaidAt && (
            <p>Repaid: {new Date(iou.repaidAt).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={copyShareLink}
          className="w-full py-2 border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
        >
          Copy Share Link
        </button>

        {iou.status === "pending" && (
          <button
            onClick={handleMarkRepaid}
            className="w-full py-2 bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-80 transition-opacity"
          >
            Mark as Repaid
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
  return phone;
}

