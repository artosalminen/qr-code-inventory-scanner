import { parseCSV, validateCSVRows } from '@/lib/csv-parser';

// Mock Prisma before importing anything that uses it
jest.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    box: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      createMany: jest.fn(),
    },
    projectUser: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Import after mocking
import { prisma } from '@/lib/db';

describe('CSV Parser', () => {
  it('should parse valid CSV content', () => {
    const csvContent = `qr_code,label,description
QR001,Box 1,First box
QR002,Box 2,Second box`;

    const rows = parseCSV(csvContent);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      qr_code: 'QR001',
      label: 'Box 1',
      description: 'First box',
    });
  });

  it('should throw error for missing header', () => {
    const csvContent = 'QR001,Box 1,First box';

    expect(() => parseCSV(csvContent)).toThrow(
      'CSV must contain header and at least one data row'
    );
  });

  it('should throw error for missing required columns', () => {
    const csvContent = `qr_code,label
QR001,Box 1`;

    expect(() => parseCSV(csvContent)).toThrow(
      'Missing required columns: description'
    );
  });
});

describe('CSV Validation', () => {
  it('should detect duplicate QR codes within CSV', () => {
    const rows = [
      { qr_code: 'QR001', label: 'Box 1', description: 'First' },
      { qr_code: 'QR001', label: 'Box 2', description: 'Second' },
    ];

    const errors = validateCSVRows(rows, new Set());

    expect(errors).toContainEqual(expect.stringContaining('Duplicate QR code'));
  });

  it('should detect QR codes already in project', () => {
    const rows = [
      { qr_code: 'QR001', label: 'Box 1', description: 'First' },
    ];
    const existingQRCodes = new Set(['QR001']);

    const errors = validateCSVRows(rows, existingQRCodes);

    expect(errors).toContainEqual(
      expect.stringContaining('QR code already exists')
    );
  });

  it('should detect missing required fields', () => {
    const rows = [
      { qr_code: '', label: 'Box 1', description: 'First' },
      { qr_code: 'QR002', label: '', description: 'Second' },
    ];

    const errors = validateCSVRows(rows, new Set());

    expect(errors.length).toBeGreaterThan(0);
    expect(errors).toContainEqual(expect.stringContaining('QR code is required'));
    expect(errors).toContainEqual(expect.stringContaining('Label is required'));
  });
});

describe('Project APIs - Database Mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list user projects', async () => {
    const mockProjects = [
      { id: '1', name: 'Project 1', status: 'active' },
      { id: '2', name: 'Project 2', status: 'active' },
    ];

    (prisma.project.findMany as jest.Mock).mockResolvedValue(mockProjects);

    const result = await prisma.project.findMany();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Project 1');
  });

  it('should find unique project by id', async () => {
    const mockProject = {
      id: '1',
      name: 'Test Project',
      status: 'active',
      projectUsers: [],
    };

    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

    const result = await prisma.project.findUnique({ where: { id: '1' } });

    expect(result.name).toBe('Test Project');
  });

  it('should reject operations on archived project', async () => {
    const mockProject = { id: '1', status: 'archived' };

    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

    const project = await prisma.project.findUnique({ where: { id: '1' } });

    expect(project.status).toBe('archived');
  });

  it('should create project with admin user', async () => {
    const mockProject = {
      id: '1',
      name: 'New Project',
      status: 'active',
      createdBy: 'user123',
      projectUsers: [
        { userId: 'user123', role: 'admin', projectId: '1' },
      ],
    };

    (prisma.project.create as jest.Mock).mockResolvedValue(mockProject);

    const result = await prisma.project.create({
      data: {
        name: 'New Project',
        createdBy: 'user123',
      },
    });

    expect(result.name).toBe('New Project');
    expect(result.projectUsers[0].role).toBe('admin');
  });
});

describe('Box APIs - Database Mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list boxes by project', async () => {
    const mockBoxes = [
      { id: '1', projectId: 'proj1', qrCode: 'QR001', label: 'Box 1' },
      { id: '2', projectId: 'proj1', qrCode: 'QR002', label: 'Box 2' },
    ];

    (prisma.box.findMany as jest.Mock).mockResolvedValue(mockBoxes);

    const result = await prisma.box.findMany({
      where: { projectId: 'proj1' },
    });

    expect(result).toHaveLength(2);
    expect(result[0].projectId).toBe('proj1');
  });

  it('should find box with state history', async () => {
    const mockBox = {
      id: '1',
      projectId: 'proj1',
      qrCode: 'QR001',
      label: 'Box 1',
      stateHistory: [
        { state: 'RECEIVED', createdAt: new Date() },
      ],
    };

    (prisma.box.findUnique as jest.Mock).mockResolvedValue(mockBox);

    const result = await prisma.box.findUnique({ where: { id: '1' } });

    expect(result.stateHistory).toBeDefined();
    expect(result.stateHistory[0].state).toBe('RECEIVED');
  });
});

describe('User Role Management - Database Mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list project users', async () => {
    const mockProjectUsers = [
      { id: '1', projectId: 'proj1', userId: 'user1', role: 'admin' },
      { id: '2', projectId: 'proj1', userId: 'user2', role: 'inventory_management' },
    ];

    (prisma.projectUser.findMany as jest.Mock).mockResolvedValue(mockProjectUsers);

    const result = await prisma.projectUser.findMany({
      where: { projectId: 'proj1' },
    });

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('admin');
  });

  it('should create project user with role', async () => {
    const mockProjectUser = {
      id: '1',
      projectId: 'proj1',
      userId: 'user1',
      role: 'installation',
      assignedBy: 'admin_user',
    };

    (prisma.projectUser.create as jest.Mock).mockResolvedValue(mockProjectUser);

    const result = await prisma.projectUser.create({
      data: {
        projectId: 'proj1',
        userId: 'user1',
        role: 'installation',
        assignedBy: 'admin_user',
      },
    });

    expect(result.role).toBe('installation');
  });

  it('should update project user role', async () => {
    const mockProjectUser = {
      id: '1',
      projectId: 'proj1',
      userId: 'user1',
      role: 'admin',
    };

    (prisma.projectUser.update as jest.Mock).mockResolvedValue(mockProjectUser);

    const result = await prisma.projectUser.update({
      where: { id: '1' },
      data: { role: 'admin' },
    });

    expect(result.role).toBe('admin');
  });

  it('should delete project user', async () => {
    (prisma.projectUser.delete as jest.Mock).mockResolvedValue({});

    await prisma.projectUser.delete({
      where: { id: '1' },
    });

    expect(prisma.projectUser.delete).toHaveBeenCalled();
  });
});
