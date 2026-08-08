import en from '../locales/en.json';
import ta from '../locales/ta.json';
import hi from '../locales/hi.json';
import te from '../locales/te.json';
import kn from '../locales/kn.json';
import ml from '../locales/ml.json';
import mr from '../locales/mr.json';
import gu from '../locales/gu.json';
import pa from '../locales/pa.json';
import bn from '../locales/bn.json';
import or from '../locales/or.json';
import as from '../locales/as.json';
import ur from '../locales/ur.json';
import kok from '../locales/kok.json';

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'kok', name: 'Konkani', nativeName: 'ಕೋಂಕಣಿ' }
];

export const translations = {
  en,
  ta,
  hi,
  te,
  kn,
  ml,
  mr,
  gu,
  pa,
  bn,
  or,
  as,
  ur,
  kok
};

/**
 * Translate a key into target language with fallback to English
 */
export const getTranslation = (langCode = 'en', key, paramsOrFallback = '') => {
  let fallback = '';
  let params = {};
  if (typeof paramsOrFallback === 'string') {
    fallback = paramsOrFallback;
  } else if (typeof paramsOrFallback === 'object' && paramsOrFallback !== null) {
    params = paramsOrFallback;
  }
  const currentLang = translations[langCode] || translations['en'];
  let val = currentLang[key] ?? translations['en'][key];
  if (val !== undefined && val !== null && val !== '') {
    if (Object.keys(params).length > 0) {
      Object.keys(params).forEach(k => {
        val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
      });
    }
    return val;
  }
  return fallback || key;
};

export default {
  LANGUAGES,
  translations,
  getTranslation
};
