import React, { createContext } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getTranslation, LANGUAGES } from './index';

export const TranslationContext = createContext();

export const TranslationProvider = ({ children }) => {
  const { user, languageCode, setLanguageCode } = useAppStore();
  
  const currentLang = languageCode || user?.languageCode || 'en';

  const changeLanguage = (langCode) => {
    if (!LANGUAGES.some(l => l.code === langCode)) return;
    setLanguageCode(langCode);
  };

  const t = (key, paramsOrFallback) => getTranslation(currentLang, key, paramsOrFallback);

  const value = {
    currentLang,
    languageCode: currentLang,
    changeLanguage,
    setLanguageCode: changeLanguage,
    t,
    languages: LANGUAGES
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export default TranslationProvider;
