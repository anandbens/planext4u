import { supabase } from "@/integrations/supabase/client";
import type { CustomerUser } from "@/lib/auth-types";

interface CustomerAddressOwnerContext {
  authUid: string | null;
  ownerIds: string[];
  preferredId: string | null;
}

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/**
 * Resolve the customer_id that satisfies the customer_addresses RLS policy:
 *   customer_id = auth.uid()::text  OR  customer_id = get_customer_id(auth.uid())
 *
 * `get_customer_id()` reads from `user_roles.customer_id`, so the DB-mapped value
 * is always the source of truth. If the user_roles row is missing or its
 * customer_id is null, we self-heal it from the in-memory CustomerUser before
 * returning, so the subsequent insert passes RLS.
 */
export async function getCustomerAddressOwnerContext(customerUser?: CustomerUser | null): Promise<CustomerAddressOwnerContext> {
  const directCustomerId = customerUser?.customer_id;
  const directId = customerUser?.id;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authUid = session?.user?.id ?? null;

  let mappedCustomerId: string | null = null;
  if (authUid) {
    const { data } = await supabase
      .from("user_roles")
      .select("customer_id")
      .eq("user_id", authUid)
      .eq("role", "customer")
      .maybeSingle();

    mappedCustomerId = isNonEmptyString((data as { customer_id?: string } | null)?.customer_id)
      ? (data as { customer_id: string }).customer_id
      : null;

    // Self-heal: if user_roles has no customer_id but we know the customer_id
    // from the in-memory CustomerUser, write it back so RLS will pass.
    if (!mappedCustomerId && isNonEmptyString(directCustomerId)) {
      const { error: upsertErr } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: authUid, role: "customer", customer_id: directCustomerId },
          { onConflict: "user_id,role" },
        );
      if (!upsertErr) mappedCustomerId = directCustomerId;
    }
  }

  // Always prefer the DB-mapped value because that is what RLS checks against.
  const preferredId = mappedCustomerId ?? directCustomerId ?? directId ?? authUid;

  const ownerIds = Array.from(
    new Set([mappedCustomerId, directCustomerId, directId, authUid].filter(isNonEmptyString)),
  );

  return {
    authUid,
    ownerIds,
    preferredId,
  };
}

export async function requireCustomerAddressOwnerContext(customerUser?: CustomerUser | null) {
  const context = await getCustomerAddressOwnerContext(customerUser);

  if (!context.preferredId) {
    throw new Error("Your session expired. Please log in again.");
  }

  return context;
}
