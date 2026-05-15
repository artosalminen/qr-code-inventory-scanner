// src/components/Login.tsx
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-4">Inventory System</h1>
        <p className="text-gray-600 mb-6">Sign in with your Google account</p>
        <button
          onClick={() => signIn('google', { redirect: true, callbackUrl: '/dashboard' })}
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}
