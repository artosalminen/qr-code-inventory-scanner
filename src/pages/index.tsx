import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Login from '@/components/Login';

export async function getServerSideProps(context: any) {
  const session = await getServerSession(context.req, context.res, authOptions);
  return {
    props: { session },
  };
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (status === 'authenticated') {
    return null;
  }

  return <Login />;
}
