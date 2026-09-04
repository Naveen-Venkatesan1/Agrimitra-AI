import React, { useEffect } from 'react';
import AppRouter from './router/AppRouter';
import { TranslationProvider } from './i18n/TranslationContext';
import { useAppStore } from './store/useAppStore';
import { onForegroundMessage } from './config/firebase';
import DevicePreview from './components/layout/DevicePreview';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export function App() {
  const initAuthListener = useAppStore((state) => state.initAuthListener);
  const fetchLiveWeather = useAppStore((state) => state.fetchLiveWeather);

  useEffect(() => {
    initAuthListener();
    fetchLiveWeather();

    // Initialize Android native appearance if available
    try {
      SplashScreen.hide().catch(() => {});
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#FFFFFF' }).catch(() => {});
    } catch (e) {}

    // Handle Android hardware back button
    let backListenerHandle = null;
    try {
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      }).then(handle => {
        backListenerHandle = handle;
      }).catch(() => {});
    } catch (e) {}

    // Listen for foreground push notifications
    let unsubscribeFCM = () => {};
    try {
      unsubscribeFCM = onForegroundMessage((payload) => {
        console.log('Foreground push notification received: ', payload);
        if (payload.notification && typeof Notification !== 'undefined') {
          new Notification(payload.notification.title || "Smart Irrigation", {
            body: payload.notification.body,
            icon: '/favicon.ico'
          });
        }
      });
    } catch (e) {
      console.warn("Failed to subscribe to foreground FCM messages:", e);
    }

    return () => {
      unsubscribeFCM();
      if (backListenerHandle && typeof backListenerHandle.remove === 'function') {
        backListenerHandle.remove();
      }
    };
  }, []);

  return (
    <DevicePreview>
      <TranslationProvider>
        <AppRouter />
      </TranslationProvider>
    </DevicePreview>
  );
}

export default App;
