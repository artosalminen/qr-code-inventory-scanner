import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

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
  await withAuth(req, res);
  if (!req.userId) return;

  const status = req.query.status || 'active';

  try {
    const projects = await prisma.project.findMany({
      where: {
        projectUsers: {
          some: {
            userId: req.userId,
          },
        },
        status: typeof status === 'string' ? status : status[0],
      },
      include: {
        projectUsers: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePost(req: AuthenticatedRequest, res: NextApiResponse) {
  await withAuth(req, res);
  if (!req.userId) return;

  const adminRole = await prisma.projectUser.findFirst({
    where: { userId: req.userId, role: 'admin' },
  });

  if (!adminRole) {
    return res.status(403).json({ error: 'Only admins can create projects' });
  }

  const { name, description } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Project name required' });
    return;
  }

  try {
    // Users can create projects (they become admin of projects they create)
    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        createdBy: req.userId,
        projectUsers: {
          create: {
            userId: req.userId,
            role: 'admin',
            assignedBy: req.userId,
          },
        },
      },
      include: { projectUsers: true },
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
