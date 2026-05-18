import { NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { parseCSV, validateCSVRows } from '@/lib/csv-parser';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  await withProjectRole(req, res, id, ['admin']);
  if (!req.userId) return;

  const { csvContent } = req.body;
  if (!csvContent || typeof csvContent !== 'string') {
    return res.status(400).json({ error: 'csvContent is required' });
  }

  let rows;
  try {
    rows = parseCSV(csvContent);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const existing = await prisma.box.findMany({
      where: { projectId: id },
      select: { qrCode: true },
    });
    const existingQRCodes = new Set(existing.map((b) => b.qrCode));

    const errors = validateCSVRows(rows, existingQRCodes);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const created = await prisma.$transaction(
      rows.map((row) =>
        prisma.box.create({
          data: {
            projectId: id,
            qrCode: row.qr_code,
            label: row.label || null,
            description: row.description || null,
          },
        }),
      ),
    );

    await prisma.$transaction(
      created.map((box) =>
        prisma.boxStateHistory.create({
          data: {
            boxId: box.id,
            state: 'expected',
            stateSetBy: req.userId!,
            changeType: 'state_change',
          },
        }),
      ),
    );

    return res.status(201).json({ created: created.length });
  } catch (error: any) {
    console.error('CSV upload error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
