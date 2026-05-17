// src/pages/api/auth/user.ts
import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await withAuth(req, res);
  if (!req.userId) {
    return; // Response already sent by withAuth
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: req.userId },
  });

  if (!dbUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.status(200).json({
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
  });
}
