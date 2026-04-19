import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves the auth.users UUID for a vendor application.
 * `vendor_applications.user_id` may store either:
 *   - the auth UUID directly (correct case)
 *   - a customer text ID like "CUST-XXXX" or "CUS-XXXX" (legacy case)
 * This helper returns the canonical auth UUID or null when no match exists.
 */
export async function resolveAuthUidFromApplication(app: {
  user_id?: string | null;
  email?: string | null;
  phone?: string | null;
}): Promise<string | null> {
  const candidate = app.user_id?.trim();

  // Already a UUID — use directly
  if (candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)) {
    return candidate;
  }

  // Look up by customer ID
  if (candidate && (candidate.startsWith("CUST-") || candidate.startsWith("CUS-") || candidate.startsWith("USR-"))) {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("customer_id", candidate)
      .eq("role", "customer")
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  // Fallback: match a customer record by email or phone, then resolve auth UID via user_roles
  if (app.email || app.phone) {
    const phoneClean = app.phone?.replace(/^\+\d{1,3}/, "").replace(/\s+/g, "");
    let q = supabase.from("customers").select("id");
    if (app.email && phoneClean) {
      q = q.or(`email.eq.${app.email},mobile.eq.${phoneClean}`);
    } else if (app.email) {
      q = q.eq("email", app.email);
    } else if (phoneClean) {
      q = q.eq("mobile", phoneClean);
    }
    const { data: customers } = await q.limit(1);
    const cid = customers?.[0]?.id;
    if (cid) {
      const { data: role } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("customer_id", cid)
        .eq("role", "customer")
        .maybeSingle();
      if (role?.user_id) return role.user_id;
    }
  }

  return null;
}

/**
 * Idempotently creates a vendor user_roles row, resolving the auth UID first.
 * Returns true if a usable link exists after the call (created or already present).
 */
export async function ensureVendorUserRole(app: {
  user_id?: string | null;
  email?: string | null;
  phone?: string | null;
}, vendorId: string): Promise<{ ok: boolean; reason?: string; userId?: string }> {
  const authUid = await resolveAuthUidFromApplication(app);
  if (!authUid) {
    return { ok: false, reason: "No auth account found for this applicant — they must register/login at least once before approval." };
  }

  // Check if a vendor link already exists for this auth user
  const { data: existing } = await supabase
    .from("user_roles")
    .select("id, vendor_id")
    .eq("user_id", authUid)
    .eq("role", "vendor")
    .maybeSingle();

  if (existing?.vendor_id === vendorId) return { ok: true, userId: authUid };

  if (existing && existing.vendor_id !== vendorId) {
    return { ok: false, reason: `This auth account is already linked to another vendor (${existing.vendor_id}). Use a different account.`, userId: authUid };
  }

  const { error } = await supabase.from("user_roles").insert({
    user_id: authUid,
    role: "vendor",
    vendor_id: vendorId,
  } as any);
  if (error) return { ok: false, reason: error.message };
  return { ok: true, userId: authUid };
}
