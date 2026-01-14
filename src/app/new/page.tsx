"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewIOU() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [toPhone, setToPhone] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { url } = await res.json();
      setPhotoUrl(url);
    } catch {
      setError("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/ious", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toPhone, description, photoUrl }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to create IOU");
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">New IOU</h1>
        <Link
          href="/dashboard"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          Cancel
        </Link>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="toPhone" className="block text-sm">
            Who do you owe?
          </label>
          <input
            id="toPhone"
            type="tel"
            value={toPhone}
            onChange={(e) => setToPhone(e.target.value)}
            placeholder="Their phone number"
            required
            className="w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm">
            What for?
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Coffee, lunch, a favor..."
            required
            rows={3}
            className="w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm">Photo (optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          
          {photoUrl ? (
            <div className="relative">
              <img
                src={photoUrl}
                alt="IOU photo"
                className="w-full h-48 object-cover border border-[var(--color-border)]"
              />
              <button
                type="button"
                onClick={() => {
                  setPhotoUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute top-2 right-2 px-2 py-1 text-xs bg-[var(--color-bg)] border border-[var(--color-border)]"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-8 border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)] transition-colors"
            >
              {uploading ? "Uploading..." : "Add photo"}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-[var(--color-accent)] text-[var(--color-bg)] border border-[var(--color-accent)] hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Creating..." : "Create IOU"}
        </button>
      </form>
    </div>
  );
}


