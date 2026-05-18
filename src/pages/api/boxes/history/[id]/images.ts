import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await withAuth(req, res);
  if (res.headersSent) return;

  const { id } = req.query as { id: string };
  const { imageUrls } = req.body as { imageUrls: string[] };

  if (!Array.isArray(imageUrls)) {
    return res.status(400).json({ error: 'imageUrls must be an array' });
  }

  if (imageUrls.length > 3) {
    return res.status(400).json({ error: 'Maximum 3 images per entry' });
  }

  const entry = await prisma.boxStateHistory.findFirst({
    where: { id },
    include: {
      box: {
        include: {
          project: {
            include: {
              projectUsers: { where: { userId: req.userId } },
            },
          },
        },
      },
    },
  });

  if (!entry) {
    return res.status(404).json({ error: 'History entry not found' });
  }

  if (!entry.box.project.projectUsers.length) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const updated = await prisma.boxStateHistory.update({
    where: { id },
    data: { imageUrls },
  });

  return res.status(200).json({ imageUrls: updated.imageUrls });
}
