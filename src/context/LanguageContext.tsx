import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { STORAGE_KEYS } from '../utils/constants';

type Language = 'en' | 'ur';

interface LanguageContextType {
  language: Language;
  isRTL: boolean;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  'app.name': { en: 'PaasWala', ur: 'پاس والا' },
  'tagline': { en: 'Apna mohalla, apni awaaz', ur: 'اپنا محلہ، اپنی آواز' },
  'welcome.back': { en: 'Welcome Back, Neighbor', ur: 'خوش آمدید، پڑوسی' },
  'sign.in': { en: 'Sign in to connect with your community', ur: 'اپنی کمیونٹی سے جڑنے کے لیے سائن ان کریں' },
  'continue.google': { en: 'Continue with Google', ur: 'گوگل کے ساتھ جاری رکھیں' },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  isRTL: false,
  setLanguage: async () => {},
  t: (key: string) => key,
});

export const useLanguage = () => useContext(LanguageContext);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
      if (saved === 'en' || saved === 'ur') {
        setLanguageState(saved);
      }
    } catch {}
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  };

  const isRTL = language === 'ur';

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, isRTL, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
