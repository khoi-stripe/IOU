/**
 * Normalize a phone number to 10 digits (US format)
 * - Removes all non-digit characters
 * - Strips leading "1" country code if present (11 digits → 10 digits)
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-digits
  let digits = phone.replace(/\D/g, "");
  
  // If 11 digits starting with "1", strip the country code
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  
  // Return null if no valid digits
  return digits.length > 0 ? digits : null;
}

