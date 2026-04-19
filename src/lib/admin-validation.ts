// Shared validation helpers for admin forms.
// Goal: stop invalid emails / phones / GSTIN / PAN / pincode from being saved
// across all admin create/edit modals.

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
// Indian mobile: 10 digits starting 6-9, optionally prefixed with +91 / 91 / 0
export const INDIAN_MOBILE_REGEX = /^(?:\+?91|0)?[6-9]\d{9}$/;
// Generic international fallback: 10–15 digits with optional +
export const INTL_MOBILE_REGEX = /^\+?\d{10,15}$/;
// GSTIN: 15 chars — 2 digit state + 10 char PAN + 1 entity + Z + checksum
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
// PAN: 5 letters + 4 digits + 1 letter
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
// Indian pincode: 6 digits, first digit 1-9
export const PINCODE_REGEX = /^[1-9]\d{5}$/;
// HSN/SAC: 4-8 digits
export const HSN_SAC_REGEX = /^\d{4,8}$/;
// URL slug: lowercase letters, numbers, hyphens
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidEmail(v: string): boolean {
  if (!v) return false;
  return EMAIL_REGEX.test(v.trim());
}

export function isValidIndianMobile(v: string): boolean {
  if (!v) return false;
  return INDIAN_MOBILE_REGEX.test(v.replace(/[\s-]/g, ""));
}

export function isValidMobile(v: string): boolean {
  if (!v) return false;
  const cleaned = v.replace(/[\s-]/g, "");
  return INDIAN_MOBILE_REGEX.test(cleaned) || INTL_MOBILE_REGEX.test(cleaned);
}

export function isValidGSTIN(v: string): boolean {
  if (!v) return false;
  return GSTIN_REGEX.test(v.trim().toUpperCase());
}

export function isValidPAN(v: string): boolean {
  if (!v) return false;
  return PAN_REGEX.test(v.trim().toUpperCase());
}

export function isValidPincode(v: string): boolean {
  if (!v) return false;
  return PINCODE_REGEX.test(v.trim());
}

export function isValidURL(v: string): boolean {
  if (!v) return false;
  try {
    new URL(v.trim());
    return true;
  } catch {
    return false;
  }
}

export function isValidHSNorSAC(v: string): boolean {
  if (!v) return false;
  return HSN_SAC_REGEX.test(v.trim());
}

export function isValidSlug(v: string): boolean {
  if (!v) return false;
  return SLUG_REGEX.test(v.trim());
}

// Full date check: returns true when the supplied YYYY-MM-DD is a real date
export function isValidISODate(v: string): boolean {
  if (!v) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

export type ValidationErrors = Record<string, string>;

/** Build a single string from all validation errors (first 3) for toast use. */
export function summariseErrors(errs: ValidationErrors): string {
  const keys = Object.keys(errs);
  if (keys.length === 0) return "";
  const first = errs[keys[0]];
  if (keys.length === 1) return first;
  return `${first} (+${keys.length - 1} more)`;
}
