import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isNativePlatform } from "@/lib/capacitor";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const CUSTOMER_STORE_URL = "https://play.google.com/store/apps/details?id=com.p4u_customer";
const VENDOR_STORE_URL = "https://play.google.com/store/apps/details?id=com.p4u.p4u_vendor";

interface Props {
  children: React.ReactNode;
}

export function ForceUpdateOverlay({ children }: Props) {
  const [updateRequired, setUpdateRequired] = useState(false);
  const [storeUrl, setStoreUrl] = useState(CUSTOMER_STORE_URL);

  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const info = await CapacitorApp.getInfo();
        const currentBuild = parseInt(info.build, 10);
        const appId = info.id;

        const isVendor =
          appId === "com.p4u.p4u_vendor" || appId === "com.planext4u.vendor";
        const varKey = isVendor
          ? "min_vendor_app_version"
          : "min_customer_app_version";

        const { data } = await supabase
          .from("platform_variables")
          .select("value")
          .eq("key", varKey)
          .maybeSingle();

        if (cancelled) return;

        if (data?.value) {
          const minBuild = parseInt(data.value, 10);
          if (!isNaN(minBuild) && currentBuild < minBuild) {
            setStoreUrl(isVendor ? VENDOR_STORE_URL : CUSTOMER_STORE_URL);
            setUpdateRequired(true);
          }
        }
      } catch {
        // If check fails, let the user through
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  const openStore = async () => {
    try {
      await Browser.open({ url: storeUrl });
    } catch {
      window.open(storeUrl, "_blank");
    }
  };

  if (updateRequired) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Update Required</h1>
          <p className="text-muted-foreground leading-relaxed">
            A new version of the app is available with important improvements
            and bug fixes. Please update to continue using the app.
          </p>
          <Button onClick={openStore} size="lg" className="w-full gap-2">
            <Download className="h-5 w-5" />
            Update Now
          </Button>
          <p className="text-xs text-muted-foreground">
            You won't be able to use the app until you update.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
