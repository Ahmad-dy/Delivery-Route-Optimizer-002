import { useState, useCallback } from 'react';
import { Locale, Messages, ARABIC_MESSAGES, ENGLISH_MESSAGES } from './messages';

export function useLocalization() {
  const [locale, setLocale] = useState<Locale>('ar');

  const messages: Messages = locale === 'ar' ? ARABIC_MESSAGES : ENGLISH_MESSAGES;
  const isRtl = locale === 'ar';

  const toggleLocale = useCallback(() => {
    setLocale(prev => (prev === 'ar' ? 'en' : 'ar'));
  }, []);

  const t = useCallback((path: string): string => {
    const keys = path.split('.');
    let current: unknown = messages;
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = (current as Record<string, unknown>)[k];
      } else {
        return path;
      }
    }
    return typeof current === 'string' ? current : path;
  }, [messages]);

  return {
    locale,
    setLocale,
    toggleLocale,
    messages,
    isRtl,
    t
  };
}
