import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

const initPrisma = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Please check your environment configuration.',
    );
  }

  console.log('Initializing Prisma Client with DATABASE_URL:', databaseUrl.substring(0, 50) + '...');

  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
    errorFormat: 'colorless',
  });
};

if (process.env.NODE_ENV === 'production') {
  try {
    prisma = initPrisma();
  } catch (error) {
    console.error('Failed to initialize Prisma in production:', error);
    throw error;
  }
} else {
  try {
    if (!global.prisma) {
      global.prisma = initPrisma();
    }
    prisma = global.prisma;
  } catch (error) {
    console.error('Failed to initialize Prisma in development:', error);
    throw error;
  }
}

if (!prisma) {
  throw new Error('Prisma client failed to initialize');
}

export default prisma;
