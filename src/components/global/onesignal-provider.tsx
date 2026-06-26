"use client"

import { useEffect } from 'react'
import OneSignal from 'react-onesignal'

let isInitialized = false;

export default function OneSignalProvider({ userId }: { userId?: string }) {
  useEffect(() => {
    async function initOneSignal() {
      if (typeof window !== 'undefined') {
        const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        if (!appId) {
          console.error("NEXT_PUBLIC_ONESIGNAL_APP_ID is not defined.");
          return;
        }

        // Disable OneSignal on localhost to prevent domain mismatch errors from the SDK
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log("OneSignal initialization skipped on localhost.");
          return;
        }

        try {
          if (!isInitialized) {
            await OneSignal.init({
              appId,
              safari_web_id: "",
              // @ts-ignore
              notifyButton: {
                enable: true,
              },
              allowLocalhostAsSecureOrigin: true,
            });
            isInitialized = true;
          }
          
          // إجبار ظهور النافذة المنزلقة (ستجلب التعريب من لوحة OneSignal)
          if (isInitialized) {
            // @ts-ignore
            await OneSignal.Slidedown.promptPush({ force: true });
          }

          if (userId) {
            await OneSignal.login(userId);
          } else {
            await OneSignal.logout();
          }
        } catch (error) {
          console.error("Error initializing OneSignal:", error);
        }
      }
    }
    
    initOneSignal();
  }, [userId]);

  return null;
}
