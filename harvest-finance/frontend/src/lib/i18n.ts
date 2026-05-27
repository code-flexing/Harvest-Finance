"use client";
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../../public/locales/en/common.json';
import es from '../../public/locales/es/common.json';
import pt from '../../public/locales/pt/common.json';
import fr from '../../public/locales/fr/common.json';
import ha from '../../public/locales/ha/common.json';

const isBrowser = typeof window !== 'undefined';

const i18nInstance = i18n.use(initReactI18next);

if (isBrowser) {
  i18nInstance.use(LanguageDetector);
}

i18nInstance.init({
    resources: {
      en: { common: en },
      es: { common: es },
      pt: { common: pt },
      fr: { common: fr },
      ha: { common: ha }
    },
    lng: isBrowser ? undefined : 'en',
    ns: ['common'],
    defaultNS: 'common',
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'cookie', 'navigator'],
      caches: ['localStorage', 'cookie'],
    }
  });

export default i18n;
