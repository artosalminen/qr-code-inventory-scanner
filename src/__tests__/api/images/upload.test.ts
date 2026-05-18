import handler from '@/pages/api/images/upload';
import { put } from '@vercel/blob';

jest.mock('@vercel/blob', () => ({ put: jest.fn() }));
jest.mock('sharp', () => {
  const chain = {
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumb-data')),
  };
  return jest.fn(() => chain);
});
jest.mock('@/lib/auth-middleware', () => ({
  withAuth: jest.fn(async (req: any) => { req.userId = 'user-1'; }),
}));

async function* yieldBuffer(buf: Buffer) { yield buf; }

function makeReq(overrides: Partial<any> = {}) {
  const req: any = {
    method: 'POST',
    query: { filename: 'photo.jpg', historyId: 'hist-1', projectId: 'proj-1', boxId: 'box-1' },
  };
  req[Symbol.asyncIterator] = yieldBuffer.bind(null, Buffer.from('image-data'));
  if (overrides.query) req.query = { ...req.query, ...overrides.query };
  if ('method' in overrides) req.method = overrides.method;
  return req;
}

function makeRes() {
  const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn(), headersSent: false };
  return res;
}

describe('POST /api/images/upload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 405 for non-POST', async () => {
    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when filename is missing', async () => {
    const res = makeRes();
    await handler(makeReq({ query: { historyId: 'h', projectId: 'p', boxId: 'b' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when historyId is missing', async () => {
    const res = makeRes();
    await handler(makeReq({ query: { filename: 'x.jpg', projectId: 'p', boxId: 'b' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('uploads original and thumbnail and returns blob url', async () => {
    (put as jest.Mock)
      .mockResolvedValueOnce({ url: 'https://blob.vercel.com/orig.jpg', pathname: 'projects/p/boxes/b/history/h/photo.jpg' })
      .mockResolvedValueOnce({ url: 'https://blob.vercel.com/thumb.jpg', pathname: 'projects/p/boxes/b/history/h/thumb_photo.jpg' });

    const res = makeRes();
    await handler(makeReq(), res);

    expect(put).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://blob.vercel.com/orig.jpg' }),
    );
  });
});
