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

  const { qrCode, label, description } = req.body;

  if (qrCode !== undefined && typeof qrCode !== 'string') {
    return res.status(400).json({ error: 'QR code must be a string' });
  }
  if (label !== undefined && typeof label !== 'string') {
    return res.status(400).json({ error: 'Label must be a string' });
  }
  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: 'Description must be a string' });
  }

  const nextQrCode = qrCode?.trim();
  if (qrCode !== undefined && !nextQrCode) {
    return res.status(400).json({ error: 'QR code cannot be empty' });
  }

  const updateData: { qrCode?: string; label?: string | null; description?: string | null } = {};
  if (qrCode !== undefined) updateData.qrCode = nextQrCode;
  if (label !== undefined) updateData.label = label.trim() || null;
  if (description !== undefined) updateData.description = description.trim() || null;

  try {
    const existing = await prisma.box.findUnique({
      where: { id: boxId },
      select: { id: true, projectId: true },
    });

    if (!existing || existing.projectId !== id) {
      return res.status(404).json({ error: 'Box not found' });
    }

    if (updateData.qrCode) {
      const duplicate = await prisma.box.findFirst({
        where: {
          projectId: id,
          qrCode: updateData.qrCode,
          id: { not: boxId },
        },
        select: { id: true },
      });

      if (duplicate) {
        return res.status(409).json({ error: 'QR code already exists in this project' });
      }
    }

    const box = await prisma.box.update({
      where: { id: boxId },
      data: updateData,
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
