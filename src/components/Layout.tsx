import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useTranslations } from 'next-intl';
import { LocaleContext } from '@/lib/locale';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { locale, setLocale } = useContext(LocaleContext);
  const t = useTranslations('nav');

  const isActive = (path: string) => router.pathname === path;

  useEffect(() => {
    if (session?.user) {
      axios.get('/api/auth/user')
        .then((res) => setIsAdmin(res.data.isAdmin ?? false))
        .catch(() => setIsAdmin(false));
    }
  }, [session]);

  const navItems = [
    { label: t('dashboard'), path: '/dashboard', icon: '📊' },
    { label: t('scanner'), path: '/scanner', icon: '📱' },
    ...(isAdmin ? [{ label: t('admin'), path: '/admin', icon: '⚙️' }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">
                📦
              </div>
              <span className="hidden sm:inline text-xl font-bold text-slate-50">
                Inventory
              </span>
            </Link>

            <nav className="hidden md:flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              {session?.user?.email && (
                <div className="hidden sm:block text-sm text-slate-400">
                  {session.user.email}
                </div>
              )}

              {/* Language toggle */}
              <div className="flex items-center gap-1 text-sm font-medium">
                <button
                  onClick={() => setLocale('en')}
                  className={locale === 'en' ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200 transition'}
                >
                  EN
                </button>
                <span className="text-slate-600">|</span>
                <button
                  onClick={() => setLocale('fi')}
                  className={locale === 'fi' ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200 transition'}
                >
                  FI
                </button>
              </div>

              <button
                onClick={() => signOut({ redirect: true, callbackUrl: '/' })}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-medium"
              >
                {t('signOut')}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                ☰
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav className="md:hidden pb-4 border-t border-slate-700">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition flex items-center gap-2 ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
