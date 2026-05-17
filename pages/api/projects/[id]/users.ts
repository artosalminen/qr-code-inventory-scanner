import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { UserRole } from '@/types';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    await handleGet(req, res);
  } else if (req.method === 'POST') {
    await handlePost(req, res);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  await withProjectRole(req, res, id, ['admin', 'inventory_management', 'installation', 'read_only']);

  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const projectUsers = await prisma.projectUser.findMany({
      where: { projectId: id },
      include: { user: true },
    });

    res.status(200).json(projectUsers);
  } catch (error) {
    console.error('Error fetching project users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePost(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  await withProjectRole(req, res, id, ['admin']);

  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      res.status(400).json({ error: 'userId and role required' });
      return;
    }

    // Validate role
    const validRoles: UserRole[] = ['admin', 'inventory_management', 'installation', 'read_only'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    // Check if user already assigned to project
    const existing = await prisma.projectUser.findUnique({
      where: {
        idx_project_user_unique: { projectId: id, userId },
      },
    });

    if (existing) {
      res.status(409).json({ error: 'User already assigned to project' });
      return;
    }

    const projectUser = await prisma.projectUser.create({
      data: {
        projectId: id,
        userId,
        role,
        assignedBy: req.userId,
      },
      include: { user: true },
    });

    res.status(201).json(projectUser);
  } catch (error) {
    console.error('Error assigning user to project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
