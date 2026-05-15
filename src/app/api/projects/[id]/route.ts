import { NextRequest, NextResponse } from 'next/server';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authenticatedReq = req as unknown as AuthenticatedRequest;
  await withProjectRole(authenticatedReq, {} as any, params.id, [
    'admin',
    'inventory_management',
    'installation',
    'read_only',
  ]);

  if (!authenticatedReq.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        projectUsers: {
          include: { user: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authenticatedReq = req as unknown as AuthenticatedRequest;
  await withProjectRole(authenticatedReq, {} as any, params.id, ['admin']);

  if (!authenticatedReq.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description } = body;

    const updated = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authenticatedReq = req as unknown as AuthenticatedRequest;
  await withProjectRole(authenticatedReq, {} as any, params.id, ['admin']);

  if (!authenticatedReq.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Archive project instead of deleting
    const updated = await prisma.project.update({
      where: { id: params.id },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error archiving project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
