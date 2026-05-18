import { NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id, boxId } = req.query;
  if (typeof id !== 'string' || typeof boxId !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await withProjectRole(req, res, id, ['admin', 'inventory_management']);
  if (!req.userId) return;

  const { description } = req.body;
  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: 'Description must be a string' });
  }

  try {
    const box = await prisma.box.update({
      where: { id: boxId },
      data: { description: description?.trim() || null },
    });
    return res.status(200).json(box);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Box not found' });
    }
    console.error('Error updating box:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
