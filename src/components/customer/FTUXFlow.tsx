import { useState, useEffect, useCallback } from "react";
import { SplashScreen } from "./SplashScreen";
import { OnboardingCarousel } from "./OnboardingCarousel";
import { PermissionScreen } from "./PermissionScreen";
import { isNativePlatform } from "@/lib/capacitor";
import { supabase } from "@/integrations/supabase/client";

type FTUXStep = "splash" | "onboarding" | "permissions" | "done";

function getDeviceId(): string {
  let id = localStorage.getItem("p4u_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("p4u_device_id", id);
  }
  return id;
}

async function getNativeDeviceId(): Promise<string> {
  if (isNativePlatform()) {
    try {
      const { Device } = await import("@capacitor/core");
      const info = await (Device as any).getId();
      if (info?.identifier) {
        localStorage.setItem("p4u_device_id", info.identifier);
        return info.identifier;
      }
    } catch {}
  }
  return getDeviceId();
}

interface FTUXFlowProps {
  children: React.ReactNode;
  userId?: string;
}

export function FTUXFlow({ children, userId }: FTUXFlowProps) {
  const [step, setStep] = useState<FTUXStep>("splash");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    // Check if onboarding needed
    const checkOnboarding = async () => {
      const deviceId = await getNativeDeviceId();

      if (userId) {
        // Check device record in backend
        const { data } = await supabase
          .from("user_devices")
          .select("onboarding_completed")
          .eq("user_id", userId)
          .eq("device_id", deviceId)
          .maybeSingle();

        if (!data) {
          // New device for this user → needs onboarding
          setNeedsOnboarding(true);
          // Create device record
          await supabase.from("user_devices").upsert({
            user_id: userId,
            device_id: deviceId,
            platform: isNativePlatform() ? "android" : "web",
            onboarding_completed: false,
          }, { onConflict: "user_id,device_id" });
        } else if (!data.onboarding_completed) {
          setNeedsOnboarding(true);
        }
      } else {
        // Not logged in — check local flag
        const completed = localStorage.getItem("p4u_onboarding_completed");
        if (!completed) setNeedsOnboarding(true);
      }
    };
    checkOnboarding();
  }, [userId]);

  const handleSplashComplete = useCallback(() => {
    if (needsOnboarding) {
      setStep("onboarding");
    } else {
      setStep("done");
    }
  }, [needsOnboarding]);

  const handleOnboardingComplete = useCallback(async () => {
    // Mark completed
    localStorage.setItem("p4u_onboarding_completed", "true");
    const deviceId = getDeviceId();

    if (userId) {
      await supabase
        .from("user_devices")
        .update({ onboarding_completed: true })
        .eq("user_id", userId)
        .eq("device_id", deviceId);
    }

    if (isNativePlatform() && !localStorage.getItem("p4u_permissions_asked")) {
      setStep("permissions");
    } else {
      setStep("done");
    }
  }, [userId]);

  const handlePermissionsComplete = useCallback(() => {
    setStep("done");
  }, []);

  if (step === "splash") {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (step === "onboarding") {
    return <OnboardingCarousel onComplete={handleOnboardingComplete} />;
  }

  if (step === "permissions") {
    return <PermissionScreen onComplete={handlePermissionsComplete} />;
  }

  return <>{children}</>;
}
