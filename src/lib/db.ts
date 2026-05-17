import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

const initPrisma = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
  });
};

if (process.env.NODE_ENV === 'production') {
  prisma = initPrisma();
} else {
  if (!global.prisma) {
    global.prisma = initPrisma();
  }
  prisma = global.prisma;
}

export default prisma;
