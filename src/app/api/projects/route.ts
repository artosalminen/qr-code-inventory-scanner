import { NextRequest, NextResponse } from 'next/server';
import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const authenticatedReq = req as unknown as AuthenticatedRequest;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dummyRes = {} as any as NextApiResponse;
  await withAuth(authenticatedReq, dummyRes);

  if (!authenticatedReq.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get('status') || 'active';

  try {
    const projects = await prisma.project.findMany({
      where: {
        projectUsers: {
          some: {
            userId: authenticatedReq.userId,
          },
        },
        status,
      },
      include: {
        projectUsers: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authenticatedReq = req as unknown as AuthenticatedRequest;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dummyRes = {} as any as NextApiResponse;
  await withAuth(authenticatedReq, dummyRes);

  if (!authenticatedReq.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Only admins can create projects
    const adminProject = await prisma.projectUser.findFirst({
      where: {
        userId: authenticatedReq.userId,
        role: 'admin',
      },
    });

    if (!adminProject) {
      return NextResponse.json(
        { error: 'Only admins can create projects' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Project name required' },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        createdBy: authenticatedReq.userId,
        projectUsers: {
          create: {
            userId: authenticatedReq.userId,
            role: 'admin',
            assignedBy: authenticatedReq.userId,
          },
        },
      },
      include: { projectUsers: true },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
