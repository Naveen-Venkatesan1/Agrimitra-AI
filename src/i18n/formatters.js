/**
 * Locale-Aware Formatting Utilities for Agrimitra AI
 * Formats Currency, Numbers, Dates, and Units according to Indian locale rules
 */

const LOCALE_MAP = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  bn: 'bn-IN',
  or: 'or-IN',
  as: 'as-IN',
  ur: 'ur-IN',
  kok: 'kok-IN'
};

/**
 * Format currency in Indian Rupees (₹) with locale-specific digit formatting
 */
export const formatCurrency = (amount, langCode = 'en') => {
  const locale = LOCALE_MAP[langCode] || 'en-IN';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  } catch (e) {
    return `₹${amount}`;
  }
};

/**
 * Format numbers with locale grouping (e.g. 1,00,000 in Indian numbering system)
 */
export const formatNumber = (num, langCode = 'en') => {
  const locale = LOCALE_MAP[langCode] || 'en-IN';
  try {
    return new Intl.NumberFormat(locale).format(num);
  } catch (e) {
    return String(num);
  }
};

import { formatAppDate, formatAppTime, formatAppDateTime, formatRelativeTime, parseValidDate } from '../utils/dateUtils';

/**
 * Format dates per locale conventions with Day, Month, Year
 */
export const formatDate = (date, langCode = 'en', options = {}) => {
  const locale = LOCALE_MAP[langCode] || 'en-IN';
  const defaultOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options
  };
  try {
    const d = parseValidDate(date);
    return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
  } catch (e) {
    return formatAppDate(date);
  }
};

export { formatAppDate, formatAppTime, formatAppDateTime, formatRelativeTime, parseValidDate };

