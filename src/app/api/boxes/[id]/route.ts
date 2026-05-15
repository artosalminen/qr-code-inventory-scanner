import { NextRequest, NextResponse } from 'next/server';
import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authenticatedReq = req as unknown as AuthenticatedRequest;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dummyRes = {} as any as NextApiResponse;
  await withAuth(authenticatedReq, dummyRes);

  if (!authenticatedReq.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const box = await prisma.box.findUnique({
      where: { id: params.id },
      include: {
        project: {
          include: {
            projectUsers: {
              where: { userId: authenticatedReq.userId },
            },
          },
        },
        stateHistory: {
          orderBy: { createdAt: 'desc' },
        },
        inUseSessions: {
          orderBy: { activatedAt: 'desc' },
        },
      },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    // Check user has access to box's project
    if (box.project.projectUsers.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(box);
  } catch (error) {
    console.error('Error fetching box:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
