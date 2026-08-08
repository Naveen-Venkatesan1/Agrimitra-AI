import React, { useEffect } from 'react';
import AppRouter from './router/AppRouter';
import { TranslationProvider } from './i18n/TranslationContext';
import { useAppStore } from './store/useAppStore';

export function App() {
  const { initAuthListener, fetchLiveWeather } = useAppStore();

  useEffect(() => {
    initAuthListener();
    fetchLiveWeather();
  }, []);

  return (
    <TranslationProvider>
      <AppRouter />
    </TranslationProvider>
  );
}

export default App;
