import { useEffect } from 'react';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/lib/auth';

export const usePushNotifications = () => {
  const { customerUser } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const setupPushNotifications = async () => {
      // Push notifications are generally native-only for Capacitor
      if (!Capacitor.isNativePlatform()) return;

      try {
        // Request permissions
        const permission = await FirebaseMessaging.requestPermissions();
        if (permission.receive !== 'granted') {
          console.warn('Push notification permissions denied');
          return;
        }

        // Get the token
        const { token } = await FirebaseMessaging.getToken();
        console.log('Firebase Cloud Messaging Token:', token);

        // If we have a logged-in user, store the token in Supabase
        if (customerUser?.supabase_uid && token && isMounted) {
          // Attempting to update the profiles table
          const { error } = await supabase
            .from('profiles')
            .update({ fcm_token: token } as Record<string, unknown>)
            .eq('id', customerUser.supabase_uid);

          if (error) {
            console.error('Error saving FCM token to Supabase:', error);
            
            // Fallback: try customers table if profiles fails
            await supabase
              .from('customers')
              .update({ fcm_token: token } as Record<string, unknown>)
              .eq('id', customerUser.supabase_uid);
          }
        }
      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    };

    // Firebase messaging event listeners
    const addListeners = async () => {
      if (!Capacitor.isNativePlatform()) return;
      
      await FirebaseMessaging.addListener('notificationReceived', (event) => {
        console.log('Push notification received', event);
      });

      await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        console.log('Push notification action performed', event);
      });
    };

    setupPushNotifications();
    addListeners();

    return () => {
      isMounted = false;
      if (Capacitor.isNativePlatform()) {
        FirebaseMessaging.removeAllListeners();
      }
    };
  }, [customerUser]);

};
