import handler from '@/pages/api/boxes/history/[id]/images';
import prisma from '@/lib/db';

jest.mock('@/lib/db', () => ({
  boxStateHistory: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock('@/lib/auth-middleware', () => ({
  withAuth: jest.fn(async (req: any) => { req.userId = 'user-1'; }),
}));

function makeReq(overrides: Partial<any> = {}) {
  return {
    method: 'PATCH',
    query: { id: 'hist-1' },
    body: { imageUrls: ['https://blob.vercel.com/photo.jpg'] },
    ...overrides,
  } as any;
}

function makeRes() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    headersSent: false,
  };
  return res;
}

describe('PATCH /api/boxes/history/[id]/images', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 405 for non-PATCH', async () => {
    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 404 if history entry not found', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 if user has no project access', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue({
      id: 'hist-1',
      imageUrls: [],
      box: { project: { projectUsers: [] } },
    });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 400 if imageUrls list has more than 3 items', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue({
      id: 'hist-1',
      imageUrls: [],
      box: { project: { projectUsers: [{ userId: 'user-1' }] } },
    });
    const res = makeRes();
    await handler(
      makeReq({ body: { imageUrls: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'] } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Maximum 3 images per entry' });
  });

  it('sets imageUrls and returns 200', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue({
      id: 'hist-1',
      imageUrls: [],
      box: { project: { projectUsers: [{ userId: 'user-1' }] } },
    });
    (prisma.boxStateHistory.update as jest.Mock).mockResolvedValue({
      imageUrls: ['https://blob.vercel.com/photo.jpg'],
    });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(prisma.boxStateHistory.update).toHaveBeenCalledWith({
      where: { id: 'hist-1' },
      data: { imageUrls: ['https://blob.vercel.com/photo.jpg'] },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ imageUrls: ['https://blob.vercel.com/photo.jpg'] });
  });
});
