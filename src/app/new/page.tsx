"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Contact {
  phone: string;
  displayName: string | null;
  isRegistered: boolean;
}

export default function NewIOU() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [toPhone, setToPhone] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch contacts on mount
  useEffect(() => {
    async function fetchContacts() {
      try {
        const res = await fetch("/api/contacts");
        if (res.ok) {
          const data = await res.json();
          setContacts(data.contacts || []);
        }
      } catch {
        // Silently fail - contacts are optional
      }
    }
    fetchContacts();
  }, []);

  // Filter contacts based on search
  const filteredContacts = contacts.filter((contact) => {
    const search = searchValue.toLowerCase();
    const nameMatch = contact.displayName?.toLowerCase().includes(search);
    const phoneMatch = contact.phone.includes(search.replace(/\D/g, ""));
    return nameMatch || phoneMatch;
  });

  // Check for duplicate names (for disambiguation)
  const nameCounts = contacts.reduce((acc, c) => {
    if (c.displayName) {
      acc[c.displayName] = (acc[c.displayName] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  function formatPhone(phone: string): string {
    // Show last 4 digits
    return `•••${phone.slice(-4)}`;
  }

  function getDisplayLabel(contact: Contact): string {
    if (!contact.displayName) {
      return contact.phone;
    }
    // If duplicate name, disambiguate with phone
    if (nameCounts[contact.displayName] > 1) {
      return `${contact.displayName} (${formatPhone(contact.phone)})`;
    }
    return contact.displayName;
  }

  function handleSelectContact(contact: Contact) {
    setSearchValue(getDisplayLabel(contact));
    setToPhone(contact.phone);
    setShowDropdown(false);
  }

  function handleInputChange(value: string) {
    setSearchValue(value);
    setShowDropdown(true);

    // If it looks like a phone number (mostly digits), use it directly
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length >= 7) {
      setToPhone(digitsOnly);
    } else {
      // Clear phone if it's not a valid number and no contact selected
      const matchedContact = contacts.find(
        (c) =>
          c.displayName?.toLowerCase() === value.toLowerCase() ||
          c.phone === digitsOnly
      );
      if (matchedContact) {
        setToPhone(matchedContact.phone);
      } else if (digitsOnly.length === 0) {
        setToPhone("");
      }
    }
  }

  function handleInputBlur() {
    // Delay to allow click on dropdown item
    setTimeout(() => setShowDropdown(false), 150);
  }

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

    // Validate we have at least something
    if (!toPhone && !description && !photoUrl) {
      setError("Add a recipient, description, or photo");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/ious", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          toPhone: toPhone || null, 
          description: description || null, 
          photoUrl 
        }),
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
          <label htmlFor="recipient" className="block text-sm">
            Who do you owe?
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="recipient"
              type="text"
              value={searchValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onBlur={handleInputBlur}
              placeholder="Name or phone number"
              autoComplete="off"
              className="w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            />

            {/* Dropdown */}
            {showDropdown && filteredContacts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 border border-[var(--color-border)] bg-[var(--color-bg)] max-h-48 overflow-y-auto">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.phone}
                    type="button"
                    onClick={() => handleSelectContact(contact)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-secondary)] flex items-center justify-between"
                  >
                    <span>{getDisplayLabel(contact)}</span>
                    {!contact.isRegistered && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        not registered
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {toPhone && searchValue !== toPhone && (
            <p className="text-xs text-[var(--color-text-muted)]">
              → {toPhone}
            </p>
          )}
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
