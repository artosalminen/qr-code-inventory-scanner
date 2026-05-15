// __tests__/auth.test.ts
import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/session');
jest.mock('@/lib/db');

describe('Authentication', () => {
  it('should retrieve current user from session', async () => {
    const mockSession = {
      user: {
        email: 'test@example.com',
        name: 'Test User',
      },
    };

    (getSessionUser as jest.Mock).mockResolvedValue(mockSession.user);

    const result = await getSessionUser({} as NextApiRequest, {} as NextApiResponse);

    expect(result).toEqual(mockSession.user);
  });

  it('should return null for unauthorized request', async () => {
    (getSessionUser as jest.Mock).mockResolvedValue(null);

    const result = await getSessionUser({} as NextApiRequest, {} as NextApiResponse);

    expect(result).toBeNull();
  });
});
