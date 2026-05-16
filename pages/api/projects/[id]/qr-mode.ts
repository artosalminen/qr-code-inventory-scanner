import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { QRMode } from '@/types';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await withProjectRole(req, res, id, ['admin']);
  if (res.headersSent) return;

  const { mode }: { mode: QRMode } = req.body;

  if (!['check-in', 'check-out'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (project?.status === 'archived') {
    return res.status(400).json({ error: 'Cannot modify archived project' });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { defaultQrMode: mode },
  });

  res.status(200).json({
    success: true,
    mode: updated.defaultQrMode,
  });
}
