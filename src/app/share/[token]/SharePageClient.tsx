"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

interface Props {
  token: string;
}

export default function SharePageClient({ token }: Props) {
  useEnableScroll();
  const router = useRouter();
  const [iou, setIou] = useState<IOU | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch IOU
        const iouRes = await fetch(`/api/ious/share/${token}`);
        if (!iouRes.ok) {
          if (iouRes.status === 404) {
            setError("IOU not found");
            return;
          }
          throw new Error("Failed to fetch");
        }
        const iouData = await iouRes.json();
        setIou(iouData.iou);

        // Check if user is logged in
        const userRes = await fetch("/api/auth/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.user);
        }
      } catch {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchData();
    }
  }, [token]);

  async function handleClaim() {
    if (!iou) return;
    
    setClaiming(true);
    try {
      const res = await fetch(`/api/ious/${iou.id}/claim`, {
        method: "POST",
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to claim IOU");
        return;
      }
      
      // Redirect to dashboard "owed" tab (user is the one being owed)
      router.push("/dashboard?tab=owed");
    } catch {
      setError("Something went wrong");
    } finally {
      setClaiming(false);
    }
  }

  // Can claim if: logged in, not the creator, and IOU is unclaimed
  const canClaim = currentUser && 
    iou && 
    currentUser.id !== iou.from_user_id && 
    !iou.to_user_id;

  // Debug logging
  console.log("Share page debug:", {
    currentUserId: currentUser?.id,
    iouFromUserId: iou?.from_user_id,
    iouToUserId: iou?.to_user_id,
    canClaim,
  });

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
        {canClaim ? (
          <>
            <p className="text-sm text-[var(--color-text-muted)]">
              Claim as <span className="font-medium text-[var(--color-text)]">{currentUser?.display_name}</span>
            </p>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full py-3 bg-[var(--color-accent)] text-[var(--color-bg)] text-center rounded-full hover:opacity-80 transition-opacity font-medium disabled:opacity-50"
            >
              {claiming ? "Claiming..." : "Claim This IOU"}
            </button>
            <button
              onClick={async () => {
                // Store IOU ID for auto-claim, log out, and go to signup
                sessionStorage.setItem("pendingClaimIOUId", iou.id);
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/");
              }}
              className="text-xs text-[var(--color-text-muted)] underline hover:text-[var(--color-text)]"
            >
              Not you? Sign up with different account
            </button>
          </>
        ) : currentUser ? (
          <Link
            href="/dashboard"
            className="inline-block w-full py-3 bg-[var(--color-accent)] text-[var(--color-bg)] text-center rounded-full hover:opacity-80 transition-opacity font-medium"
          >
            Go to Dashboard
          </Link>
        ) : (
          <>
            <p className="text-sm text-[var(--color-text-muted)]">
              Sign up to claim this IOU
            </p>
            <Link
              href="/"
              onClick={() => {
                // Store the IOU ID so we can auto-claim after login
                sessionStorage.setItem("pendingClaimIOUId", iou.id);
              }}
              className="inline-block w-full py-3 bg-[var(--color-accent)] text-[var(--color-bg)] text-center rounded-full hover:opacity-80 transition-opacity font-medium"
            >
              Sign Up / Log In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

