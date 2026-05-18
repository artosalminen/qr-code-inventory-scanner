jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    projectUser: { findFirst: jest.fn() },
  },
}));

jest.mock('@/lib/auth-middleware', () => ({
  withAuth: jest.fn(async (req: any) => { req.userId = 'user-1'; }),
}));

import handler from '@/pages/api/auth/user';
import prisma from '@/lib/db';
import type { NextApiResponse } from 'next';

const mockProjectUser = prisma.projectUser as { findFirst: jest.Mock };
const mockUser = prisma.user as { findUnique: jest.Mock };

function makeReqRes() {
  const req: any = { method: 'GET' };
  const json = jest.fn();
  const res = { status: jest.fn().mockReturnThis(), json } as unknown as NextApiResponse;
  return { req, res, json };
}

const baseUser = { id: 'user-1', email: 'a@test.com', name: 'A' };

describe('/api/auth/user — canScan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.findUnique.mockResolvedValue(baseUser);
  });

  it('returns canScan: false when user has only read_only roles', async () => {
    mockProjectUser.findFirst
      .mockResolvedValueOnce(null)  // adminRole — not an admin
      .mockResolvedValueOnce(null); // scanRole — no non-read_only role found

    const { req, res, json } = makeReqRes();
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ canScan: false }));
  });

  it('returns canScan: true when user has at least one non-read_only role', async () => {
    mockProjectUser.findFirst
      .mockResolvedValueOnce(null)                       // adminRole
      .mockResolvedValueOnce({ role: 'installation' }); // scanRole — found

    const { req, res, json } = makeReqRes();
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ canScan: true }));
  });
});
