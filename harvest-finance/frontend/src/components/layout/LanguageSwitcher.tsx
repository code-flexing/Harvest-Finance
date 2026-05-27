'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: 'en', name: t('languages.en') },
    { code: 'fr', name: t('languages.fr') },
    { code: 'ha', name: t('languages.ha') },
  ];

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-harvest-green-500">
        <Globe className="h-4 w-4 text-gray-500" />
        <span className="uppercase">{mounted ? i18n.language.split('-')[0] : 'en'}</span>
      </button>

      <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-xl border border-gray-100 bg-white p-1 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${mounted && i18n.language === lang.code
                ? 'bg-harvest-green-50 text-harvest-green-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  );
};
