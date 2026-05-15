// src/lib/session.ts
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { NextApiRequest, NextApiResponse } from 'next';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return null;
  }
  return session.user;
}

export async function getSessionUser(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return null;
  }
  return session.user;
}

export async function requireAuth(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req, res);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return user;
}
