import handler from '@/pages/api/images/view';
import prisma from '@/lib/db';

jest.mock('@/lib/db', () => ({
  boxStateHistory: { findFirst: jest.fn() },
}));
jest.mock('@/lib/auth-middleware', () => ({
  withAuth: jest.fn(async (req: any) => { req.userId = 'user-1'; }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const ORIG_URL =
  'https://xxx.blob.vercel-storage.com/projects/proj-1/boxes/box-1/history/hist-1/photo.jpg';
const THUMB_URL =
  'https://xxx.blob.vercel-storage.com/projects/proj-1/boxes/box-1/history/hist-1/thumb_photo.jpg';

function makeReq(query: Partial<Record<string, string>> = {}) {
  return {
    method: 'GET',
    query: { url: ORIG_URL, size: 'full', ...query },
  } as any;
}

function makeRes() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    setHeader: jest.fn(),
    end: jest.fn(),
    headersSent: false,
  };
  return res;
}

function mockBlobResponse() {
  return {
    ok: true,
    headers: { get: jest.fn().mockReturnValue('image/jpeg') },
    arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('img').buffer),
  };
}

describe('GET /api/images/view', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 405 for non-GET', async () => {
    const res = makeRes();
    await handler({ ...makeReq(), method: 'POST' } as any, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 if url param is missing', async () => {
    const res = makeRes();
    await handler(makeReq({ url: undefined }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 if no matching history entry found', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('fetches thumbnail URL when size=thumb', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue({
      box: { project: { projectUsers: [{ userId: 'user-1' }] } },
    });
    mockFetch.mockResolvedValue(mockBlobResponse());

    await handler(makeReq({ size: 'thumb' }), makeRes());

    expect(mockFetch).toHaveBeenCalledWith(
      THUMB_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.stringContaining('Bearer') }),
      }),
    );
  });

  it('proxies the blob and sets Content-Type header', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue({
      box: { project: { projectUsers: [{ userId: 'user-1' }] } },
    });
    mockFetch.mockResolvedValue(mockBlobResponse());

    const res = makeRes();
    await handler(makeReq(), res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    expect(res.end).toHaveBeenCalled();
  });
});
