import { NextRequest, NextResponse } from 'next/server';
import { NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { UserRole } from '@/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
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
    const { role } = body;
    const validRoles: UserRole[] = [
      'admin',
      'inventory_management',
      'installation',
      'read_only',
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const projectUser = await prisma.projectUser.update({
      where: {
        idx_project_user_unique: {
          projectId: params.id,
          userId: params.userId,
        },
      },
      data: { role },
    });

    return NextResponse.json(projectUser);
  } catch (error) {
    console.error('Error updating project user:', error);
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Project user not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const authenticatedReq = req as unknown as AuthenticatedRequest;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dummyRes = {} as any as NextApiResponse;
  await withProjectRole(authenticatedReq, dummyRes, params.id, ['admin']);

  if (!authenticatedReq.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.projectUser.delete({
      where: {
        idx_project_user_unique: {
          projectId: params.id,
          userId: params.userId,
        },
      },
    });

    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting project user:', error);
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Project user not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
