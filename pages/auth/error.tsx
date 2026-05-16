import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;
  const { data: session } = useSession();

  if (session) {
    router.replace('/dashboard');
    return null;
  }

  const errorMessages: Record<string, string> = {
    Callback: 'There was an issue during authentication. Please try again.',
    OAuthSignin: 'Error connecting to the OAuth provider.',
    OAuthCallback: 'Error completing the OAuth authentication.',
    EmailCreateAccount: 'Could not create user account.',
    Callback: 'Authentication error.',
    OAuthAccountNotLinked: 'Email already exists with a different provider.',
    EmailSignInError: 'Email sign in failed.',
    CredentialsSignin: 'Sign in failed.',
    SessionCallback: 'Session update failed.',
    default: 'An authentication error occurred.',
  };

  const message = typeof error === 'string' ? errorMessages[error] || errorMessages.default : errorMessages.default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
        <p className="text-gray-700 mb-6">{message}</p>
        <button
          onClick={() => signIn('google')}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
