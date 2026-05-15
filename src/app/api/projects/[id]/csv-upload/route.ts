import { NextRequest, NextResponse } from 'next/server';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { parseCSV, validateCSVRows } from '@/lib/csv-parser';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authenticatedReq = req as unknown as AuthenticatedRequest;
  await withProjectRole(authenticatedReq, {} as any, params.id, ['admin']);

  if (!authenticatedReq.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check project exists and is not archived
    const project = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.status === 'archived') {
      return NextResponse.json(
        { error: 'Cannot import CSV to archived project' },
        { status: 400 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const csvContent = await file.text();
    const rows = parseCSV(csvContent);

    // Validate against existing boxes
    const existingBoxes = await prisma.box.findMany({
      where: { projectId: params.id },
      select: { qrCode: true },
    });
    const existingQRCodes = new Set(existingBoxes.map((b) => b.qrCode));

    const errors = validateCSVRows(rows, existingQRCodes);
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Create boxes in transaction
    const boxes = await prisma.box.createMany({
      data: rows.map((row) => ({
        projectId: params.id,
        qrCode: row.qr_code,
        label: row.label || null,
        description: row.description || null,
      })),
    });

    // Update project's CSV upload timestamp
    await prisma.project.update({
      where: { id: params.id },
      data: { csvUploadedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      boxesCreated: boxes.count,
    });
  } catch (error: any) {
    console.error('Error uploading CSV:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
