import { useState, useEffect, useCallback } from "react";
import { VendorSplashScreen } from "./VendorSplashScreen";
import { VendorOnboardingCarousel } from "./VendorOnboardingCarousel";

type VendorFTUXStep = "splash" | "onboarding" | "done";

const VENDOR_ONBOARDING_KEY = "p4u_vendor_onboarding_completed";

interface VendorFTUXFlowProps {
  children: React.ReactNode;
}

export function VendorFTUXFlow({ children }: VendorFTUXFlowProps) {
  const [step, setStep] = useState<VendorFTUXStep>("splash");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(VENDOR_ONBOARDING_KEY);
    if (!completed) setNeedsOnboarding(true);
  }, []);

  const handleSplashComplete = useCallback(() => {
    if (needsOnboarding) {
      setStep("onboarding");
    } else {
      setStep("done");
    }
  }, [needsOnboarding]);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem(VENDOR_ONBOARDING_KEY, "true");
    setStep("done");
  }, []);

  if (step === "splash") {
    return <VendorSplashScreen onComplete={handleSplashComplete} />;
  }

  if (step === "onboarding") {
    return <VendorOnboardingCarousel onComplete={handleOnboardingComplete} />;
  }

  return <>{children}</>;
}
