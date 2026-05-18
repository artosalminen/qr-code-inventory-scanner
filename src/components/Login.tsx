import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('login');

  useEffect(() => {
    const handleSignIn = async () => {
      setIsLoading(true);
      await signIn('google', { redirect: false });
    };
    if (router.query.signin) {
      handleSignIn();
    }
  }, [router.query.signin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 sm:p-12 shadow-2xl backdrop-blur-xl bg-opacity-80">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-3xl">📦</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-50 text-center mb-2">
            {t('heading')}
          </h1>
          <p className="text-slate-400 text-center text-sm sm:text-base mb-8">
            {t('subheading')}
          </p>

          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-blue-400 text-xl mt-1">✓</span>
              <div>
                <p className="text-slate-50 font-medium text-sm">{t('featureTrackingTitle')}</p>
                <p className="text-slate-400 text-xs">{t('featureTrackingDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 text-xl mt-1">✓</span>
              <div>
                <p className="text-slate-50 font-medium text-sm">{t('featureScanTitle')}</p>
                <p className="text-slate-400 text-xs">{t('featureScanDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 text-xl mt-1">✓</span>
              <div>
                <p className="text-slate-50 font-medium text-sm">{t('featureTeamTitle')}</p>
                <p className="text-slate-400 text-xs">{t('featureTeamDesc')}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => signIn('google', { redirect: true, callbackUrl: '/dashboard' })}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 active:scale-95"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⌛</span>
                {t('signingIn')}
              </>
            ) : (
              <>
                <span>🔐</span>
                {t('signInButton')}
              </>
            )}
          </button>

          <p className="text-xs text-slate-500 text-center mt-6">
            {t('footer')}
          </p>
        </div>
      </div>
    </div>
  );
}
