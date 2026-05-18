import { PrismaClient } from '@prisma/client';

const initPrisma = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Please check your environment configuration.',
    );
  }

  console.log('Initializing Prisma Client');

  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
    errorFormat: 'colorless',
  });
};

const prismaClientSingleton = () => {
  if (process.env.NODE_ENV === 'production') {
    return initPrisma();
  } else {
    if (!global.prisma) {
      global.prisma = initPrisma();
    }
    return global.prisma;
  }
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof initPrisma> | undefined;
}

let prisma: ReturnType<typeof initPrisma>;

try {
  prisma = prismaClientSingleton();
} catch (error) {
  console.error('Prisma Client initialization error:', error);
  throw error;
}

export default prisma;
