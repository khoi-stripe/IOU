"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Loader from "@/components/Loader";
import Logo from "@/components/Logo";
import ImageWithLoader from "@/components/ImageWithLoader";

// Enable scrolling on share pages (overrides global overflow:hidden)
function useEnableScroll() {
  useEffect(() => {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);
}

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

interface Props {
  token: string;
}

export default function SharePageClient({ token }: Props) {
  useEnableScroll();
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
    return <Loader className="h-dvh" />;
  }

  if (error || !iou) {
    return (
      <div className="min-h-dvh overflow-y-auto space-y-6 text-center py-12">
        <h1 className="text-xl font-bold"><Logo /></h1>
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
    <div className="min-h-dvh overflow-y-auto py-8 space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-2xl font-bold"><Logo /></h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          A record of a favor
        </p>
      </header>

      <div className="p-6 bg-[var(--color-bg-secondary)] rounded-[4px] space-y-4">
        <div className="text-center">
          <p style={{ fontSize: "16px" }}>
            <span className="font-bold">{fromName}</span> owes you
          </p>
          {iou.description ? (
            <p style={{ fontSize: "16px" }} className="font-bold">{iou.description}</p>
          ) : (
            <p style={{ fontSize: "16px" }} className="text-[var(--color-text-muted)] italic">a favor</p>
          )}
        </div>

        {iou.photo_url && (
          <ImageWithLoader
            src={iou.photo_url}
            alt="IOU photo"
            className="w-full aspect-[4/3]"
          />
        )}

        <div className="flex justify-between items-center text-sm text-[var(--color-text-muted)]">
          <span>{new Date(iou.created_at).toLocaleDateString()}</span>
          <span
            className={`px-2 py-1 rounded border ${
              iou.status === "pending"
                ? "border-[var(--color-border)]"
                : "bg-[var(--color-accent)] text-[var(--color-bg)] border-transparent"
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
          className="inline-block w-full py-3 bg-[var(--color-accent)] text-[var(--color-bg)] text-center rounded-full hover:opacity-80 transition-opacity font-medium"
        >
          Sign Up / Log In
        </Link>
      </div>
    </div>
  );
}

