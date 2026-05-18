import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const initPrisma = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Please check your environment configuration.',
    );
  }

  console.log('Initializing Prisma Client with serverless driver');

  // Use serverless driver for Vercel/serverless environments
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
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
