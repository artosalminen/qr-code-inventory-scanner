import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { LocaleContext, getStoredLocale, setStoredLocale } from '@/lib/locale';
import enMessages from '../../messages/en.json';
import fiMessages from '../../messages/fi.json';

const inter = Inter({ subsets: ['latin'] });
const messages = { en: enMessages, fi: fiMessages };

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [locale, setLocaleState] = useState<'en' | 'fi'>('en');

  useEffect(() => {
    setLocaleState(getStoredLocale());
  }, []);

  const setLocale = (l: string) => {
    setStoredLocale(l as 'en' | 'fi');
    setLocaleState(l as 'en' | 'fi');
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        <SessionProvider session={session}>
          <div className={inter.className}>
            <Component {...pageProps} />
          </div>
        </SessionProvider>
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
