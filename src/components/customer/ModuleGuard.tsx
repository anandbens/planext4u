/**
 * ModuleGuard
 *
 * Wraps a route element and renders a "Coming Soon" view when the corresponding
 * module is disabled in `platform_variables` (controlled from the admin website).
 * This enforces the disable at the route level so that even direct URL navigation
 * (browser address bar, deep link, push notification) cannot reach the page.
 *
 * While module status is loading, render nothing to avoid a flash of the gated
 * content.
 */
import { ReactNode } from "react";
import { useModuleStatus, type ModuleKey } from "@/hooks/useModuleStatus";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Sparkles } from "lucide-react";

interface ModuleGuardProps {
  moduleKey: ModuleKey;
  children: ReactNode;
  /**
   * Display name used in the Coming Soon copy. Falls back to a humanized
   * version of the module key.
   */
  label?: string;
}

const DEFAULT_LABELS: Record<ModuleKey, string> = {
  shop: "Shop",
  socio: "Socio",
  services: "Services",
  homes: "Find Home",
  classifieds: "Classifieds",
  food: "Food",
};

export function ModuleGuard({ moduleKey, children, label }: ModuleGuardProps) {
  const { modules, isLoading } = useModuleStatus();

  if (isLoading) return null;

  const enabled = modules[moduleKey] !== false;
  if (enabled) return <>{children}</>;

  const displayName = label || DEFAULT_LABELS[moduleKey];

  return (
    <CustomerLayout>
      <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
        <div className="text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">{displayName} — Coming Soon</h1>
          <p className="text-sm text-muted-foreground">
            We're putting the finishing touches on {displayName}. Please check back shortly — it'll be available very soon!
          </p>
        </div>
      </div>
    </CustomerLayout>
  );
}
