import { NextApiResponse } from 'next';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

export const config = {
  api: { bodyParser: false },
};

async function readBody(req: AuthenticatedRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as unknown as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function mimeFromFilename(filename: string): string {
  const ext = (filename.split('.').pop() ?? '').toLowerCase();
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return types[ext] ?? 'image/jpeg';
}

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await withAuth(req, res);
  if (res.headersSent) return;

  const { filename, historyId, projectId, boxId } = req.query as Record<string, string>;
  if (!filename || !historyId || !projectId || !boxId) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    const buffer = await readBody(req);
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const basePath = `projects/${projectId}/boxes/${boxId}/history/${historyId}`;
    const contentType = mimeFromFilename(safeName);

    const thumbBuffer = await sharp(buffer)
      .resize({ width: 400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const [original] = await Promise.all([
      put(`${basePath}/${safeName}`, buffer, {
        access: 'private',
        contentType,
        addRandomSuffix: false,
      }),
      put(`${basePath}/thumb_${safeName}`, thumbBuffer, {
        access: 'private',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
      }),
    ]);

    return res.status(200).json({ url: original.url, pathname: original.pathname });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
