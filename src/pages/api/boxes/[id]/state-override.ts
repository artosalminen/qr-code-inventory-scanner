import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { BoxState } from '@/types';

const validStates: BoxState[] = ['received', 'in_use', 'ready_for_checkout', 'departed'];

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid box ID' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await withAuth(req, res);
  if (res.headersSent) return;

  const { newState, reason } = req.body;

  if (!newState || !validStates.includes(newState)) {
    return res.status(400).json({ error: 'Invalid new state' });
  }

  if (!reason || reason.trim() === '') {
    return res.status(400).json({ error: 'Reason is required for manual override' });
  }

  try {
    const box = await prisma.box.findUnique({
      where: { id },
      include: {
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

    const projectUser = box.project.projectUsers[0];
    if (!projectUser || !['admin', 'inventory_management'].includes(projectUser.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const stateHistory = await prisma.boxStateHistory.create({
      data: {
        boxId: id,
        state: newState,
        stateSetBy: req.userId!,
        changeType: 'manual_override',
        notes: reason,
      },
    });

    res.status(200).json({
      success: true,
      newState: stateHistory.state,
      timestamp: stateHistory.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
