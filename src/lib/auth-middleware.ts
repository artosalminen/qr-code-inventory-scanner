// src/lib/auth-middleware.ts
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from './db';
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
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!dbUser) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  req.userId = dbUser.id;
  req.userEmail = user.email;
  req.userName = user.name || '';
}

export async function withProjectRole(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  projectId: string,
  requiredRoles: UserRole[],
) {
  await withAuth(req, res);
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const projectUser = await prisma.projectUser.findUnique({
    where: {
      idx_project_user_unique: {
        projectId,
        userId: req.userId,
      },
    },
  });

  if (!projectUser || !requiredRoles.includes(projectUser.role as UserRole)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
}
