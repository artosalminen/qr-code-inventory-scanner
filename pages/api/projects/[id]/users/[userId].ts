import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    await handleDelete(req, res);
  } else if (req.method === 'PUT') {
    await handlePut(req, res);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id, userId } = req.query;

  if (typeof id !== 'string' || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID or user ID' });
  }

  await withProjectRole(req, res, id, ['admin']);
  if (res.headersSent) return;

  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Prevent removing the last admin
    const admins = await prisma.projectUser.findMany({
      where: { projectId: id, role: 'admin' },
    });

    if (admins.length === 1 && admins[0].userId === userId) {
      return res.status(400).json({ error: 'Cannot remove the last admin from the project' });
    }

    await prisma.projectUser.delete({
      where: {
        idx_project_user_unique: { projectId: id, userId },
      },
    });

    res.status(200).json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not assigned to project' });
    }
    console.error('Error removing user from project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePut(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id, userId } = req.query;

  if (typeof id !== 'string' || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID or user ID' });
  }

  await withProjectRole(req, res, id, ['admin']);
  if (res.headersSent) return;

  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ error: 'Role is required' });
  }

  const validRoles = ['admin', 'inventory_management', 'installation', 'read_only'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const projectUser = await prisma.projectUser.update({
      where: {
        idx_project_user_unique: { projectId: id, userId },
      },
      data: { role },
      include: { user: true },
    });

    res.status(200).json(projectUser);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not assigned to project' });
    }
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
