/**
 * useModuleStatus
 *
 * Reads top-level module enablement flags from `platform_variables` and exposes
 * a typed map. When a module is `false`, the customer app should render a
 * "Coming Soon" affordance instead of navigating into the module, and home-page
 * widgets that reference the module should be hidden.
 *
 * Keys checked: module_shop_enabled, module_socio_enabled, module_services_enabled,
 * module_homes_enabled, module_classifieds_enabled, module_food_enabled.
 * Defaults to `true` if a key is missing so we never accidentally hide everything.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ModuleKey = "shop" | "socio" | "services" | "homes" | "classifieds" | "food";

const KEY_MAP: Record<ModuleKey, string> = {
  shop: "module_shop_enabled",
  socio: "module_socio_enabled",
  services: "module_services_enabled",
  homes: "module_homes_enabled",
  classifieds: "module_classifieds_enabled",
  food: "module_food_enabled",
};

const FALLBACK: Record<ModuleKey, boolean> = {
  shop: true, socio: true, services: true, homes: true, classifieds: true, food: true,
};

export function useModuleStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ["module_status"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("platform_variables")
        .select("key,value")
        .in("key", Object.values(KEY_MAP));
      const out: Record<ModuleKey, boolean> = { ...FALLBACK };
      (rows || []).forEach((r: any) => {
        const entry = (Object.entries(KEY_MAP) as [ModuleKey, string][]).find(([, v]) => v === r.key);
        if (entry) out[entry[0]] = String(r.value).toLowerCase() === "true";
      });
      return out;
    },
    staleTime: 60_000,
  });
  return { modules: data || FALLBACK, isLoading };
}

export function isModuleEnabled(modules: Record<ModuleKey, boolean>, key: ModuleKey) {
  return modules[key] !== false;
}
