import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;
  const { data: session } = useSession();
  const t = useTranslations('errors');

  if (session) {
    router.replace('/dashboard');
    return null;
  }

  const errorMessages: Record<string, string> = {
    Callback: t('callback'),
    OAuthSignin: t('oAuthSignin'),
    OAuthCallback: t('oAuthCallback'),
    EmailCreateAccount: t('emailCreateAccount'),
    OAuthAccountNotLinked: t('oAuthAccountNotLinked'),
    EmailSignInError: t('emailSignInError'),
    CredentialsSignin: t('credentialsSignin'),
    SessionCallback: t('sessionCallback'),
    default: t('default'),
  };

  const message = typeof error === 'string'
    ? errorMessages[error] || errorMessages.default
    : errorMessages.default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">{t('title')}</h1>
        <p className="text-gray-700 mb-6">{message}</p>
        <button
          onClick={() => signIn('google')}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          {t('tryAgain')}
        </button>
      </div>
    </div>
  );
}
