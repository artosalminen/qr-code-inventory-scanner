import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
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
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  await withProjectRole(req, res, id, [
    'admin',
    'inventory_management',
    'installation',
    'read_only',
  ]);

  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const boxes = await prisma.box.findMany({
      where: { projectId: id },
      include: {
        stateHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(boxes);
  } catch (error) {
    console.error('Error fetching boxes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePost(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  await withProjectRole(req, res, id, ['admin', 'inventory_management']);

  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { qrCode, label, description, condition, notes } = req.body;

  // Validate required fields
  if (!qrCode || typeof qrCode !== 'string' || qrCode.trim() === '') {
    return res.status(400).json({ error: 'QR code is required' });
  }

  try {
    // Check for duplicate QR code within the project
    const existing = await prisma.box.findFirst({
      where: {
        projectId: id,
        qrCode: qrCode.trim(),
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'QR code already exists in this project' });
    }

    // Create the box
    const box = await prisma.box.create({
      data: {
        projectId: id,
        qrCode: qrCode.trim(),
        label: label?.trim() || null,
        description: description?.trim() || null,
      },
    });

    // Create initial state history entry (EXPECTED state)
    await prisma.boxStateHistory.create({
      data: {
        boxId: box.id,
        state: 'expected',
        stateSetBy: req.userId,
        changeType: 'state_change',
        condition: null,
        notes: notes || null,
      },
    });

    const boxWithState = await prisma.box.findUnique({
      where: { id: box.id },
      include: {
        stateHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    res.status(201).json(boxWithState);
  } catch (error) {
    console.error('Error creating box:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
