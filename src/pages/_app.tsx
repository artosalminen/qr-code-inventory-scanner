import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import Head from 'next/head';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { LocaleContext, getStoredLocale, setStoredLocale, type Locale } from '@/lib/locale';
import { useQueueFlush } from '@/hooks/useQueueFlush';
import type { FlushResult } from '@/hooks/useQueueFlush';
import enMessages from '../../messages/en.json';
import fiMessages from '../../messages/fi.json';

const inter = Inter({ subsets: ['latin'] });
const messages = { en: enMessages, fi: fiMessages };

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [locale, setLocaleState] = useState<'en' | 'fi'>('en');
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  useEffect(() => {
    setLocaleState(getStoredLocale());
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  useQueueFlush((result: FlushResult) => {
    const msg =
      result.failed.length > 0
        ? `${result.succeeded} scan${result.succeeded !== 1 ? 's' : ''} synced. Failed: ${result.failed.map((f) => f.qrCode).join(', ')}`
        : `${result.succeeded} scan${result.succeeded !== 1 ? 's' : ''} synced`;
    setSyncNotification(msg);
    setTimeout(() => setSyncNotification(null), 5000);
  });

  const setLocale = (l: Locale) => {
    setStoredLocale(l);
    setLocaleState(l);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        <SessionProvider session={session}>
          <>
            <Head>
              <link rel="manifest" href="/manifest.json" />
              <meta name="theme-color" content="#2563eb" />
              <meta name="apple-mobile-web-app-capable" content="yes" />
              <meta name="apple-mobile-web-app-status-bar-style" content="default" />
              <meta name="apple-mobile-web-app-title" content="Inventory" />
              <link rel="apple-touch-icon" href="/icons/icon-192.png" />
            </Head>
            <div className={inter.className}>
              <Component {...pageProps} />
            </div>
            {syncNotification && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-slate-100 border border-slate-600 rounded-lg px-4 py-3 shadow-lg text-sm max-w-sm text-center">
                {syncNotification}
              </div>
            )}
          </>
        </SessionProvider>
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
