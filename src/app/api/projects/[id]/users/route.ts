import { NextRequest, NextResponse } from 'next/server';
import { NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { UserRole } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authenticatedReq = req as unknown as AuthenticatedRequest;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dummyRes = {} as any as NextApiResponse;
  await withProjectRole(authenticatedReq, dummyRes, params.id, ['admin']);

  if (!authenticatedReq.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const projectUsers = await prisma.projectUser.findMany({
      where: { projectId: params.id },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return NextResponse.json(projectUsers);
  } catch (error) {
    console.error('Error fetching project users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authenticatedReq = req as unknown as AuthenticatedRequest;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dummyRes = {} as any as NextApiResponse;
  await withProjectRole(authenticatedReq, dummyRes, params.id, ['admin']);

  if (!authenticatedReq.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, role } = body;
    const validRoles: UserRole[] = [
      'admin',
      'inventory_management',
      'installation',
      'read_only',
    ];

    if (!userId || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid user or role' },
        { status: 400 }
      );
    }

    const projectUser = await prisma.projectUser.create({
      data: {
        projectId: params.id,
        userId,
        role,
        assignedBy: authenticatedReq.userId,
      },
      include: { user: true },
    });

    return NextResponse.json(projectUser, { status: 201 });
  } catch (error) {
    console.error('Error creating project user:', error);
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'User already assigned to project' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
