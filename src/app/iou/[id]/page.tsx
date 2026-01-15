"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function IOUDetail() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
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

  async function handleShare() {
    if (!iou) return;

    const toName = iou.to_user?.display_name || (iou.to_phone ? formatPhone(iou.to_phone) : "someone");
    const text = `I owe ${toName}${iou.description ? `: ${iou.description}` : ""}`;
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

  if (loading) {
    return <Loader className="h-dvh" />;
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

  const toName = iou.to_user?.display_name || (iou.to_phone ? formatPhone(iou.to_phone) : null);

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
        {toName && (
          <div className="space-y-2">
            <p className="text-sm text-[var(--color-text-muted)]">You owe</p>
            <p className="text-xl font-bold">{toName}</p>
          </div>
        )}

        {iou.description ? (
          <div className="space-y-2">
            <p className="text-sm text-[var(--color-text-muted)]">For</p>
            <p className="text-lg">{iou.description}</p>
          </div>
        ) : !toName && (
          <div className="space-y-2">
            <p className="text-lg text-[var(--color-text-muted)] italic">No details yet</p>
          </div>
        )}

        {iou.photo_url && (
          <img
            src={iou.photo_url}
            alt="IOU photo"
            className="w-full h-64 object-cover border border-[var(--color-border)]"
          />
        )}

        <div className="text-sm text-[var(--color-text-muted)]">
          <p>Created: {new Date(iou.created_at).toLocaleDateString()}</p>
          {iou.repaid_at && (
            <p>Repaid: {new Date(iou.repaid_at).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleShare}
          className="w-full py-2 bg-white text-black hover:opacity-80 transition-opacity rounded-full"
        >
          Share
        </button>

        {iou.status === "pending" && (
          <button
            onClick={handleMarkRepaid}
            className="w-full py-2 bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-80 transition-opacity rounded-full"
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

