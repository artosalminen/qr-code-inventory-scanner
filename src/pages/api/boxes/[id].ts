import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid box ID' });
  }

  await withAuth(req, res);
  if (res.headersSent) return;

  try {
    const box = await prisma.box.findUnique({
      where: { id },
      include: {
        stateHistory: {
          orderBy: { createdAt: 'desc' },
        },
        project: {
          include: {
            projectUsers: {
              where: { userId: req.userId },
            },
          },
        },
      },
    });

    if (!box) {
      return res.status(404).json({ error: 'Box not found' });
    }

    // Check if user has access to this box's project
    if (!box.project.projectUsers.length) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.status(200).json(box);
  } catch (error) {
    console.error('Error fetching box:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
