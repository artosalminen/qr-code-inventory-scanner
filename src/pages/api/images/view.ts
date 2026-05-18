import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

function deriveThumbnailUrl(url: string): string {
  const parts = url.split('/');
  parts[parts.length - 1] = `thumb_${parts[parts.length - 1]}`;
  return parts.join('/');
}

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await withAuth(req, res);
  if (res.headersSent) return;

  const { url, size } = req.query as Record<string, string>;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  const entry = await prisma.boxStateHistory.findFirst({
    where: { imageUrls: { has: url } },
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

  if (!entry || !entry.box.project.projectUsers.length) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const fetchUrl = size === 'thumb' ? deriveThumbnailUrl(url) : url;

  try {
    const response = await fetch(fetchUrl, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Blob not found' });
    }

    const contentType = response.headers.get('Content-Type') ?? 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    console.error('View error:', error);
    return res.status(500).json({ error: 'Failed to fetch image' });
  }
}
