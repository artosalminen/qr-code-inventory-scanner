import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    await handleGet(req, res);
  } else if (req.method === 'PUT') {
    await handlePut(req, res);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  await withProjectRole(req, res, id, [
    'admin',
    'inventory_management',
    'installation',
    'read_only',
  ]);

  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        projectUsers: {
          include: { user: true },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.status(200).json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePut(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  await withProjectRole(req, res, id, ['admin']);

  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { name, description, status } = req.body;

    if (name !== undefined && !name) {
      return res.status(400).json({ error: 'Project name cannot be empty' });
    }

    if (status !== undefined && status !== 'active' && status !== 'archived') {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description || null;
    if (status !== undefined) {
      data.status = status;
      data.archivedAt = status === 'archived' ? new Date() : null;
    }

    const project = await prisma.project.update({
      where: { id },
      data,
      include: {
        projectUsers: {
          include: { user: true },
        },
      },
    });

    res.status(200).json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
