import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Bell, Camera, MessageSquare, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNativePlatform } from "@/lib/capacitor";

interface PermissionItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  required: boolean;
}

const PERMISSIONS: PermissionItem[] = [
  {
    id: "location",
    icon: <MapPin className="h-6 w-6" />,
    title: "Location Access",
    description: "Required to show nearby vendors, services, and delivery options.",
    required: true,
  },
  {
    id: "notifications",
    icon: <Bell className="h-6 w-6" />,
    title: "Push Notifications",
    description: "Get real-time updates on orders, offers, and messages.",
    required: false,
  },
  {
    id: "camera",
    icon: <Camera className="h-6 w-6" />,
    title: "Camera Access",
    description: "Take photos for KYC verification and profile pictures.",
    required: false,
  },
  {
    id: "sms",
    icon: <MessageSquare className="h-6 w-6" />,
    title: "SMS Auto-Read",
    description: "Automatically read OTP from SMS for faster login.",
    required: false,
  },
];

interface PermissionScreenProps {
  onComplete: () => void;
}

export function PermissionScreen({ onComplete }: PermissionScreenProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  // Only show on native platform
  if (!isNativePlatform()) {
    onComplete();
    return null;
  }

  const handleAllow = async () => {
    const perm = PERMISSIONS[currentIdx];
    try {
      if (perm.id === "location") {
        const { Geolocation } = await import("@capacitor/geolocation");
        const result = await Geolocation.requestPermissions();
        setStatuses((s) => ({ ...s, [perm.id]: result.location }));
      } else if (perm.id === "notifications") {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const result = await PushNotifications.requestPermissions();
        setStatuses((s) => ({ ...s, [perm.id]: result.receive }));
      } else if (perm.id === "camera") {
        try {
          const camPkg = "@capacitor/camera";
          const mod = await import(/* @vite-ignore */ camPkg);
          if (mod?.Camera) {
            const result = await mod.Camera.requestPermissions();
            setStatuses((s) => ({ ...s, [perm.id]: result.camera }));
          } else {
            setStatuses((s) => ({ ...s, [perm.id]: "granted" }));
          }
        } catch {
          setStatuses((s) => ({ ...s, [perm.id]: "granted" }));
        }
      } else {
        setStatuses((s) => ({ ...s, [perm.id]: "skipped" }));
      }
    } catch {
      setStatuses((s) => ({ ...s, [perm.id]: "denied" }));
    }
    advance();
  };

  const handleSkip = () => {
    const perm = PERMISSIONS[currentIdx];
    setStatuses((s) => ({ ...s, [perm.id]: "skipped" }));
    advance();
  };

  const advance = () => {
    if (currentIdx >= PERMISSIONS.length - 1) {
      localStorage.setItem("p4u_permissions_asked", "true");
      onComplete();
    } else {
      setCurrentIdx((i) => i + 1);
    }
  };

  const perm = PERMISSIONS[currentIdx];

  return (
    <div className="fixed inset-0 z-[9997] flex flex-col items-center justify-center bg-background px-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={perm.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex flex-col items-center text-center gap-6 max-w-sm"
        >
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {perm.icon}
          </div>
          <h2 className="text-xl font-bold text-foreground">{perm.title}</h2>
          <p className="text-muted-foreground text-sm">{perm.description}</p>

          <div className="flex flex-col gap-3 w-full mt-4">
            <Button onClick={handleAllow} className="w-full h-12 rounded-xl gap-2">
              <Check className="h-4 w-4" /> Allow
            </Button>
            {!perm.required && (
              <Button variant="outline" onClick={handleSkip} className="w-full h-12 rounded-xl gap-2">
                <X className="h-4 w-4" /> Skip
              </Button>
            )}
          </div>

          {/* Progress */}
          <p className="text-xs text-muted-foreground">
            {currentIdx + 1} of {PERMISSIONS.length}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
