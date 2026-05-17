import { NextRequest, NextResponse } from 'next/server';
import { NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authenticatedReq = req as unknown as AuthenticatedRequest;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dummyRes = {} as any as NextApiResponse;
  await withProjectRole(authenticatedReq, dummyRes, params.id, [
    'admin',
    'inventory_management',
    'installation',
    'read_only',
  ]);

  if (!authenticatedReq.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const boxes = await prisma.box.findMany({
      where: { projectId: params.id },
      include: {
        stateHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(boxes);
  } catch (error) {
    console.error('Error fetching boxes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
