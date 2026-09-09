import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, SupportedLanguage, TranslationDictionary } from '../i18n/translations';
import { MediaItem } from '../types';

const STORAGE_KEY = 'animehub-language';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: keyof TranslationDictionary, defaultText?: string) => string;
  resolveTitle: (item?: Partial<MediaItem> | null) => string;
  resolveGenre: (genre: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'ru' || saved === 'en') {
          return saved;
        }
      } catch (e) {
        // Ignore localStorage access errors
      }
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {
        // Ignore localStorage access errors
      }
    }
  }, []);

  const t = useCallback(
    (key: keyof TranslationDictionary, defaultText?: string): string => {
      const dict = translations[language] || translations.en;
      return dict[key] || defaultText || String(key);
    },
    [language]
  );

  /**
   * Strictly adheres to the user prompt's title resolution priority:
   * Russian mode:
   * 1. Russian title if available
   * 2. English title
   * 3. Native title
   * English mode:
   * 1. English title
   * 2. Native title
   * 3. Russian title
   * Never invents titles. Never translates titles automatically.
   */
  const resolveTitle = useCallback(
    (item?: Partial<MediaItem> | null): string => {
      if (!item) return '';

      const russian = item.titles?.russian || item.russianTitle;
      const english = item.titles?.english || item.englishTitle;
      const native = item.titles?.native || item.japaneseTitle;
      const romaji = item.titles?.romaji;
      const primary = item.title;

      if (language === 'ru') {
        if (russian && russian.trim()) return russian;
        if (english && english.trim()) return english;
        if (native && native.trim()) return native;
        if (romaji && romaji.trim()) return romaji;
        return primary || '';
      }

      // English mode
      if (english && english.trim()) return english;
      if (native && native.trim()) return native;
      if (russian && russian.trim()) return russian;
      if (romaji && romaji.trim()) return romaji;
      return primary || '';
    },
    [language]
  );

  /**
   * Helper to translate genre pills and filter badges when Russian is active.
   */
  const resolveGenre = useCallback(
    (genre: string): string => {
      if (language === 'en' || !genre) return genre;
      const cleanKey = `genre${genre.replace(/[^a-zA-Z0-9]/g, '')}` as keyof TranslationDictionary;
      const dict = translations.ru;
      if (cleanKey in dict) {
        return dict[cleanKey];
      }
      return genre;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, resolveTitle, resolveGenre }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
