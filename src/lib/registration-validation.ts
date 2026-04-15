import { supabase } from "@/integrations/supabase/client";

/**
 * Check if a phone number is already registered in the customers table.
 * Returns an error message if duplicate found, null otherwise.
 */
export async function checkCustomerPhoneUnique(phone: string): Promise<string | null> {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length !== 10) return null; // Don't check incomplete numbers

  const normalizedPhone = `+91${cleaned}`;
  const { data } = await supabase
    .from("customers")
    .select("id")
    .or(`mobile.eq.${normalizedPhone},mobile.eq.${cleaned}`)
    .limit(1)
    .maybeSingle();

  if (data) return "This mobile number is already registered. Please login instead.";
  return null;
}

/**
 * Check if an email is already registered in the customers table.
 */
export async function checkCustomerEmailUnique(email: string): Promise<string | null> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  const { data } = await supabase
    .from("customers")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (data) return "This email is already registered. Please login instead.";
  return null;
}

/**
 * Check if a phone number is already registered in vendor_applications or vendors table.
 * Vendors can have the same phone as a customer (cross-table allowed).
 */
export async function checkVendorPhoneUnique(phone: string): Promise<string | null> {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length !== 10) return null;

  const normalizedPhone = `+91${cleaned}`;

  // Check vendors table
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .or(`mobile.eq.${normalizedPhone},mobile.eq.${cleaned}`)
    .limit(1)
    .maybeSingle();

  if (vendor) return "This mobile number is already registered as a vendor. Please login instead.";

  // Check pending vendor_applications
  const { data: app } = await supabase
    .from("vendor_applications")
    .select("id, status")
    .or(`phone.eq.${normalizedPhone},phone.eq.${cleaned}`)
    .not("status", "eq", "rejected")
    .limit(1)
    .maybeSingle();

  if (app) return "A vendor application with this phone number already exists.";
  return null;
}

/**
 * Check if an email is already registered in vendor_applications or vendors table.
 */
export async function checkVendorEmailUnique(email: string): Promise<string | null> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  const trimmedEmail = email.toLowerCase().trim();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("email", trimmedEmail)
    .maybeSingle();

  if (vendor) return "This email is already registered as a vendor. Please login instead.";

  const { data: app } = await supabase
    .from("vendor_applications")
    .select("id, status")
    .eq("email", trimmedEmail)
    .not("status", "eq", "rejected")
    .limit(1)
    .maybeSingle();

  if (app) return "A vendor application with this email already exists.";
  return null;
}

/**
 * Validate phone number format (10 digits for Indian numbers).
 */
export function validatePhoneFormat(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, "");
  if (!cleaned) return "Phone number is required";
  if (cleaned.length !== 10) return "Phone number must be exactly 10 digits";
  if (!/^[6-9]\d{9}$/.test(cleaned)) return "Please enter a valid Indian mobile number";
  return null;
}

/**
 * Validate email format.
 */
export function validateEmailFormat(email: string): string | null {
  if (!email || !email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Please enter a valid email address";
  return null;
}
