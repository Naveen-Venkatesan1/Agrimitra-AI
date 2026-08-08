import { useContext } from 'react';
import { TranslationContext } from '../i18n/TranslationContext';
import { getTranslation, LANGUAGES } from '../i18n';
import { useAppStore } from '../store/useAppStore';

export const useTranslation = () => {
  const context = useContext(TranslationContext);

  if (context) {
    return context;
  }

  // Fallback if used outside TranslationProvider (or before mount)
  const { user, languageCode, setLanguageCode } = useAppStore();
  const currentLang = languageCode || user?.languageCode || 'en';

  const t = (key, paramsOrFallback) => getTranslation(currentLang, key, paramsOrFallback);

  const changeLanguage = (langCode) => {
    setLanguageCode(langCode);
  };

  return {
    t,
    currentLang,
    languageCode: currentLang,
    changeLanguage,
    setLanguageCode: changeLanguage,
    languages: LANGUAGES
  };
};

export default useTranslation;
