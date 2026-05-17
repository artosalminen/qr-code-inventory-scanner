import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get('status') || 'active';

  try {
    const projects = await prisma.project.findMany({
      where: {
        projectUsers: {
          some: {
            userId: dbUser.id,
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
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  try {
    // Only admins can create projects
    const adminProject = await prisma.projectUser.findFirst({
      where: {
        userId: dbUser.id,
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
        createdBy: dbUser.id,
        projectUsers: {
          create: {
            userId: dbUser.id,
            role: 'admin',
            assignedBy: dbUser.id,
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
