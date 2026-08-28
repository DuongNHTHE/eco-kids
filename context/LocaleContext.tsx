'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AvailableLanguage, DEFAULT_LANGUAGE, languageLabels, supportedLanguages, getStoredLanguage, setStoredLanguage, translate } from '../lib/locale';

type LocaleContextValue = {
  language: AvailableLanguage;
  setLanguage: (language: AvailableLanguage) => void;
  t: (key: string) => string;
  languageLabel: string;
  availableLanguages: Array<{ value: AvailableLanguage; label: string }>;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { readonly children: React.ReactNode }) {
  const [language, setLanguage] = useState<AvailableLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    setLanguage(getStoredLanguage());
  }, [setLanguage]);

  const updateLanguage = useCallback((newLang: AvailableLanguage) => {
    const stored = setStoredLanguage(newLang);
    setLanguage(stored);
  }, [setLanguage]);

  const value = useMemo(
    (): LocaleContextValue => ({
      language,
      setLanguage: updateLanguage,
      t: (key: string) => translate(key, language),
      languageLabel: languageLabels[language],
      availableLanguages: supportedLanguages.map((value) => ({ value, label: languageLabels[value] })),
    }),
    [language, updateLanguage],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
