"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import ImageWithLoader from "@/components/ImageWithLoader";

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
    return `•••${phone.slice(-4)}`;
  }

  function getDisplayLabel(contact: Contact): string {
    if (!contact.displayName) {
      return contact.phone;
    }
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

    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length >= 7) {
      setToPhone(digitsOnly);
    } else {
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

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setPhotoUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent | React.MouseEvent, shouldShare: boolean = false) {
    e.preventDefault();
    setError("");

    if (!description) {
      setError("Please describe what the IOU is for");
      return;
    }

    // Validate recipient field if something was entered
    if (searchValue && !toPhone) {
      // User typed something but didn't select a contact
      // Check if it looks like a phone number (has digits)
      const digits = searchValue.replace(/\D/g, "");
      if (digits.length < 10) {
        setError("Please enter a valid phone number or select a contact");
        return;
      }
      // If it has enough digits, use it as a phone number
      setToPhone(digits);
    }

    setLoading(true);

    // Use the validated phone number
    const phoneToSubmit = toPhone || (searchValue ? searchValue.replace(/\D/g, "") : null);
    const validPhone = phoneToSubmit && phoneToSubmit.length >= 10 ? phoneToSubmit : null;

    try {
      const res = await fetch("/api/ious", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toPhone: validPhone,
          description: description || null,
          photoUrl,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to create IOU");
      }

      const data = await res.json();

      // If sharing, open native share dialog before navigating
      if (shouldShare && data.iou?.share_token) {
        const url = `${window.location.origin}/share/${data.iou.share_token}`;
        const recipientName = searchValue || "someone";
        
        try {
          if (navigator.share) {
            // Native share (works on HTTPS)
            await navigator.share({
              url,
              title: "IOU",
              text: `I owe ${recipientName}: ${description}`,
            });
          } else {
            // Fallback: show prompt with URL for manual copy (works on HTTP)
            prompt("Copy this link to share:", url);
          }
        } catch {
          // User cancelled share - still navigate
        }
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Shared styles
  const labelClass = "block text-xs uppercase mb-2 font-medium";
  const inputClass =
    "w-full px-4 py-3 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] rounded-lg focus:outline-none focus:border-[var(--color-accent)]";
  const primaryButtonClass =
    "flex-1 py-3 bg-[var(--color-accent)] text-[var(--color-bg)] rounded-full text-sm uppercase font-medium hover:opacity-80 disabled:opacity-50 transition-opacity";
  const secondaryButtonClass =
    "flex-1 py-3 border border-[var(--color-border)] text-[var(--color-text)] rounded-full text-sm uppercase font-medium hover:border-[var(--color-accent)] transition-colors";

  return (
    <div className="h-dvh flex flex-col px-2">
      {/* Header */}
      <header className="pt-8 pb-4 text-center shrink-0 relative">
        <h1 className="text-lg font-medium">New <Logo /></h1>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="absolute right-2 top-8 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </header>

      {/* Spacer - pushes form to bottom */}
      <div className="flex-1 min-h-0" />

      {/* Form content */}
      <div className="shrink-0 pb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipient */}
          <div>
            <label htmlFor="recipient" className={labelClass}>
              Who Do You Owe?
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
                className={inputClass}
              />

              {/* Dropdown */}
              {showDropdown && filteredContacts.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-[var(--color-accent)] text-[var(--color-bg)] rounded-lg max-h-48 overflow-y-auto">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.phone}
                      type="button"
                      onClick={() => handleSelectContact(contact)}
                      className="w-full px-4 py-3 text-left text-sm hover:opacity-70 active:opacity-50 active:scale-[0.98] transition-all flex items-center justify-between first:rounded-t-lg last:rounded-b-lg"
                    >
                      <span>{getDisplayLabel(contact)}</span>
                      {!contact.isRegistered && (
                        <span className="text-xs opacity-60">
                          not registered
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={labelClass}>
              What For?
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Coffee, lunch, a favor..."
              rows={3}
              required
              className={inputClass + " resize-none"}
            />
          </div>

          {/* Photo */}
          <div>
            <label className={labelClass}>Photo (Optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {photoUrl ? (
              <div className="relative">
                <ImageWithLoader
                  src={photoUrl}
                  alt="IOU photo"
                  className="w-full h-48 rounded-lg border border-[var(--color-border)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-3 right-3 px-3 py-1 text-xs uppercase bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-8 border border-dashed border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)] transition-colors text-sm uppercase"
              >
                {uploading ? "Uploading..." : "Add Photo"}
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Buttons */}
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={(e) => handleSubmit(e, false)} 
              disabled={loading} 
              className={secondaryButtonClass}
            >
              {loading ? "..." : "Create"}
            </button>
            <button 
              type="button" 
              onClick={(e) => handleSubmit(e, true)} 
              disabled={loading} 
              className={primaryButtonClass}
            >
              {loading ? "..." : "Create & Share"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
