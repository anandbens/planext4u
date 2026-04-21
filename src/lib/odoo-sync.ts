// Frontend wrapper for the odoo-sync edge function.
import { supabase } from "@/integrations/supabase/client";

export type OdooAction = "test_connection" | "push_order" | "push_product" | "pull_inventory" | "retry_failed";

async function invoke(action: OdooAction, payload: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("odoo-sync", { body: { action, ...payload } });
  if (error) throw new Error(error.message || "Odoo sync failed");
  if (data && data.ok === false) throw new Error(data.error || "Odoo sync failed");
  return data;
}

export const odooSync = {
  test: () => invoke("test_connection"),
  pushOrder: (order_id: string) => invoke("push_order", { order_id }),
  pushProduct: (product_id: string) => invoke("push_product", { product_id }),
  pullInventory: () => invoke("pull_inventory"),
  retryFailed: () => invoke("retry_failed"),
};

/** Fire-and-forget order push when Odoo is enabled. Never throws. */
export async function maybePushOrderToOdoo(order_id: string) {
  try {
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("odoo_enabled")
      .eq("id", 1)
      .maybeSingle();
    if (!settings?.odoo_enabled) return;
    await invoke("push_order", { order_id });
  } catch (e) {
    console.warn("[odoo] push_order skipped", e);
  }
}
