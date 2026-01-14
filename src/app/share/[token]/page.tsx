"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  
  const [iou, setIou] = useState<IOU | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchIOU() {
      try {
        const res = await fetch(`/api/ious/share/${token}`);
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

    if (token) {
      fetchIOU();
    }
  }, [token]);

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
        <h1 className="text-xl font-bold" style={{ letterSpacing: '0.3em' }}>👁️🅾️🐑</h1>
        <p className="text-[var(--color-text-muted)]">
          {error || "IOU not found"}
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
        >
          Go to App
        </Link>
      </div>
    );
  }

  const fromName = iou.from_user?.display_name || "Someone";

  return (
    <div className="space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-2xl font-bold" style={{ letterSpacing: '0.3em' }}>👁️🅾️🐑</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          A record of a favor
        </p>
      </header>

      <div className="p-6 border border-[var(--color-border)] space-y-4">
        <div className="text-center space-y-2">
          <p className="text-lg">
            <span className="font-bold">{fromName}</span> owes you
          </p>
          <p className="text-2xl font-bold">{iou.description}</p>
        </div>

        {iou.photo_url && (
          <img
            src={iou.photo_url}
            alt="IOU photo"
            className="w-full h-48 object-cover border border-[var(--color-border)]"
          />
        )}

        <div className="flex justify-between items-center text-sm text-[var(--color-text-muted)]">
          <span>{new Date(iou.created_at).toLocaleDateString()}</span>
          <span
            className={`px-2 py-1 ${
              iou.status === "pending"
                ? "bg-[var(--color-bg-secondary)]"
                : "bg-[var(--color-accent)] text-[var(--color-bg)]"
            }`}
          >
            {iou.status === "pending" ? "Outstanding" : "Repaid"}
          </span>
        </div>
      </div>

      <div className="space-y-3 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          Track your own IOUs with friends
        </p>
        <Link
          href="/"
          className="inline-block w-full py-2 bg-[var(--color-accent)] text-[var(--color-bg)] text-center hover:opacity-80 transition-opacity"
        >
          Sign Up / Log In
        </Link>
      </div>
    </div>
  );
}

