import { supabase } from "@/integrations/supabase/client";
import type { CustomerUser } from "@/lib/auth-types";

interface CustomerAddressOwnerContext {
  authUid: string | null;
  ownerIds: string[];
  preferredId: string | null;
}

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

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
  }

  const ownerIds = Array.from(
    new Set([directCustomerId, directId, mappedCustomerId, authUid].filter(isNonEmptyString)),
  );

  return {
    authUid,
    ownerIds,
    preferredId: mappedCustomerId ?? directCustomerId ?? directId ?? authUid,
  };
}

export async function requireCustomerAddressOwnerContext(customerUser?: CustomerUser | null) {
  const context = await getCustomerAddressOwnerContext(customerUser);

  if (!context.preferredId) {
    throw new Error("Your session expired. Please log in again.");
  }

  return context;
}