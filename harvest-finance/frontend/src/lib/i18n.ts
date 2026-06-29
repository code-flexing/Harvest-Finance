'use client';

import { useTranslations } from 'next-intl';

export function useTranslation() {
  const t = useTranslations();

  let language = 'en';
  if (typeof window !== 'undefined') {
    const cookieMatch = document.cookie.match(/(^|;)\s*NEXT_LOCALE\s*=\s*([^;]+)/);
    language = cookieMatch ? cookieMatch[2] : localStorage.getItem('NEXT_LOCALE') || 'en';
  }

  const changeLanguage = (lng: string) => {
    if (typeof window !== 'undefined') {
      document.cookie = `NEXT_LOCALE=${lng}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem('NEXT_LOCALE', lng);
      
      // Persist language preference per logged-in user
      const userStr = localStorage.getItem('harvest_auth_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user && user.id) {
            localStorage.setItem(`harvest_locale_user_${user.id}`, lng);
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      // Force page reload so that next-intl re-reads the new locale cookie on layout.tsx
      window.location.reload();
    }
  };

  return {
    t,
    i18n: {
      language,
      changeLanguage,
    }
  };
}

const defaultI18n = {
  language: 'en',
  changeLanguage: () => Promise.resolve(),
};

export default defaultI18n;
