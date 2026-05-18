import { createContext } from 'react';

export type Locale = 'en' | 'fi';

export interface LocaleContextType {
  locale: string;
  setLocale: (locale: string) => void;
}

export const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
});

export const getStoredLocale = (): Locale => {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('locale');
  return stored === 'fi' ? 'fi' : 'en';
};

export const setStoredLocale = (locale: string): void => {
  localStorage.setItem('locale', locale);
};
