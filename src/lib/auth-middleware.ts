// src/lib/auth-middleware.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from './db';
import { getSessionUser } from './session';
import { UserRole } from '@/types';

export interface AuthenticatedRequest extends NextApiRequest {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export async function withAuth(
  req: AuthenticatedRequest,
  res: NextApiResponse,
) {
  const user = await getSessionUser(req, res);
  if (!user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!dbUser) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.userId = dbUser.id;
  req.userEmail = user.email;
  req.userName = user.name || '';
  return null;
}

export async function withProjectRole(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  projectId: string,
  requiredRoles: UserRole[],
) {
  const authError = await withAuth(req, res);
  if (authError) return authError;

  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projectUser = await prisma.projectUser.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: req.userId,
      },
    },
  });

  if (!projectUser || !requiredRoles.includes(projectUser.role as UserRole)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return null;
}
