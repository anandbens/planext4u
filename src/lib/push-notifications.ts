import { isNativePlatform } from "@/lib/capacitor";
import { supabase } from "@/integrations/supabase/client";

/**
 * Push notification service for Capacitor Android app.
 * Handles FCM token registration, notification listeners, and deep linking.
 */

let initialized = false;

export async function initPushNotifications(userId?: string) {
  if (!isNativePlatform() || initialized) return;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") {
      console.warn("Push notification permission denied");
      return;
    }

    // Register with FCM
    await PushNotifications.register();

    // Listen for token
    PushNotifications.addListener("registration", async (token) => {
      console.log("FCM Token:", token.value);
      if (userId) {
        await savePushToken(userId, token.value);
      }
      // Store locally for later use
      localStorage.setItem("p4u_push_token", token.value);
    });

    // Registration error
    PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration error:", err);
    });

    // Notification received while app is in foreground
    PushNotifications.addListener("pushNotificationReceived", async (notification) => {
      console.log("Push notification received:", notification);
      // Show in-app notification using dynamic import
      const { toast } = await import("sonner");
      toast(notification.title || "Notification", {
        description: notification.body || "",
      });
    });

    // Notification clicked (foreground, background, or killed state)
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("Push notification action:", action);
      const data = action.notification.data;
      if (data?.deep_link) {
        // Navigate to the deep link path
        window.location.href = data.deep_link;
      } else if (data?.route) {
        window.location.href = data.route;
      }
    });

    initialized = true;
  } catch (err) {
    console.error("Failed to init push notifications:", err);
  }
}

async function savePushToken(userId: string, token: string) {
  const deviceId = localStorage.getItem("p4u_device_id") || "";
  const platform = isNativePlatform() ? "android" : "web";

  try {
    // Upsert into user_devices
    const { error } = await supabase
      .from("user_devices")
      .upsert(
        {
          user_id: userId,
          device_id: deviceId,
          platform,
          push_token: token,
        },
        { onConflict: "user_id,device_id" }
      );

    if (error) {
      console.error("Failed to save push token:", error);
    }
  } catch (err) {
    console.error("Error saving push token:", err);
  }
}

/**
 * Update push token when user logs in (link token to user)
 */
export async function linkPushTokenToUser(userId: string) {
  const token = localStorage.getItem("p4u_push_token");
  if (token) {
    await savePushToken(userId, token);
  }
}

/**
 * Clear push token on logout
 */
export async function clearPushToken(userId: string) {
  const deviceId = localStorage.getItem("p4u_device_id") || "";
  try {
    await supabase
      .from("user_devices")
      .update({ push_token: "" })
      .eq("user_id", userId)
      .eq("device_id", deviceId);
  } catch {
    // ignore
  }
}
