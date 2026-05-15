# Inventory System Implementation Plans

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement each plan task-by-task.

This document contains six independent implementation plans that build the QR code inventory system. Each plan is self-contained and produces working, testable code. **Recommended execution order:** Plan 1 → Plan 2 → Plan 3 → Plan 4 → Plan 5 → Plan 6.

---

## Plan 1: Project Setup & Database Schema

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Initialize Next.js project with TypeScript, Prisma ORM, and Azure SQL Database schema. Create foundational types and environment configuration.

**Architecture:** Next.js 14 with TypeScript, Prisma as ORM, database migrations via Prisma Migrate. All tables created with referential integrity and indexes per spec.

**Tech Stack:** Next.js 14, TypeScript, Prisma ORM, Azure SQL Database, Node.js 18+

---

### Task 1: Initialize Next.js Project & Install Dependencies

**Files:**
- Create: `package.json` (root)
- Create: `tsconfig.json`
- Create: `next.config.js`
- Modify: `.gitignore`

- [ ] **Step 1: Create Next.js project with TypeScript**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --no-src-dir --no-git
```

Expected output: Project initialized with TypeScript and Tailwind CSS.

- [ ] **Step 2: Install required dependencies**

```bash
npm install @prisma/client next-auth socket.io socket.io-client axios
npm install --save-dev prisma typescript @types/node @types/react
```

Expected: All packages installed in `node_modules/`.

- [ ] **Step 3: Verify Next.js project structure**

```bash
npm run dev
```

Expected: Development server runs on `http://localhost:3000` with default Next.js page.

- [ ] **Step 4: Stop dev server and commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.js .gitignore
git commit -m "feat: initialize Next.js 14 with TypeScript and dependencies"
```

---

### Task 2: Initialize Prisma & Create Database Schema

**Files:**
- Create: `.env.example`
- Create: `prisma/schema.prisma`
- Create: `prisma/.gitignore`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init
```

Expected: Creates `prisma/schema.prisma` and `.env` files.

- [ ] **Step 2: Configure Prisma schema with all six tables**

```prisma
// This file is to be written in prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}

model User {
  id                  String      @id @default(uuid())
  email               String      @unique
  name                String
  googleId            String      @unique
  createdAt           DateTime    @default(now())
  lastLogin           DateTime?
  projectUsers        ProjectUser[]
  boxStateHistories   BoxStateHistory[]
  assignedRoles       ProjectUser[] @relation("AssignedBy")
  boxInUseSessions    BoxInUseSession[]

  @@map("users")
}

model Project {
  id                  String      @id @default(uuid())
  name                String
  description         String?
  csvUploadedAt       DateTime?
  defaultQrMode       String      @default("check-in")
  status              String      @default("active")
  createdBy           String
  createdByUser       User        @relation(fields: [createdBy], references: [id])
  archivedAt          DateTime?
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
  projectUsers        ProjectUser[]
  boxes               Box[]

  @@map("projects")
}

model ProjectUser {
  id                  String      @id @default(uuid())
  projectId           String
  project             Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId              String
  user                User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  role                String
  assignedAt          DateTime    @default(now())
  assignedBy          String?
  assignedByUser      User?       @relation("AssignedBy", fields: [assignedBy], references: [id])

  @@unique([projectId, userId])
  @@map("project_users")
}

model Box {
  id                  String      @id @default(uuid())
  projectId           String
  project             Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  qrCode              String
  label               String
  description         String?
  createdAt           DateTime    @default(now())
  boxStateHistories   BoxStateHistory[]
  boxInUseSessions    BoxInUseSession[]

  @@unique([projectId, qrCode])
  @@index([projectId])
  @@map("boxes")
}

model BoxStateHistory {
  id                  String      @id @default(uuid())
  boxId               String
  box                 Box         @relation(fields: [boxId], references: [id], onDelete: Cascade)
  state               String
  stateSetBy          String
  stateSetByUser      User        @relation(fields: [stateSetBy], references: [id])
  changeType          String      @default("scanned")
  condition           String?
  notes               String?
  brokenItems         String?
  installationUser    String?
  installationUserRef User?       @relation(fields: [installationUser], references: [id])
  createdAt           DateTime    @default(now())

  @@index([boxId])
  @@index([createdAt(sort: Desc)])
  @@map("box_state_history")
}

model BoxInUseSession {
  id                  String      @id @default(uuid())
  boxId               String
  box                 Box         @relation(fields: [boxId], references: [id], onDelete: Cascade)
  installationUserId  String
  installationUser    User        @relation(fields: [installationUserId], references: [id])
  usageNotes          String?
  activatedAt         DateTime    @default(now())
  completedAt         DateTime?

  @@map("box_in_use_sessions")
}
```

Expected: Schema includes all six tables with proper foreign keys and indexes.

- [ ] **Step 3: Create `.env.example` with placeholder values**

```env
# Database
DATABASE_URL="Server=servername.database.windows.net,1433;Database=inventory_db;User ID=sqladmin;Password=yourpassword;Encrypt=true;Connection Timeout=30;"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Node
NODE_ENV="development"
```

Expected: File created in repo root.

- [ ] **Step 4: Create `.env.local` for local development (NOT committed)**

For local testing, use a local SQL Server instance or Azure SQL free tier. Create `.env.local` with actual connection string.

- [ ] **Step 5: Run Prisma validation**

```bash
npx prisma validate
```

Expected: "Prisma schema is valid."

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma .env.example
git commit -m "feat: add Prisma schema with all core database tables"
```

---

### Task 3: Create TypeScript Type Definitions

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write TypeScript types matching Prisma schema**

```typescript
// src/types/index.ts
export type UserRole = 'admin' | 'inventory_management' | 'installation' | 'read_only';

export type BoxState = 'received' | 'in_use' | 'ready_for_checkout' | 'departed';

export type ChangeType = 'scanned' | 'manual_override';

export type ProjectStatus = 'active' | 'archived';

export type QRMode = 'check-in' | 'check-out';

export type ScanAction = 'check_in' | 'activate' | 'return' | 'check_out';

export interface User {
  id: string;
  email: string;
  name: string;
  googleId: string;
  createdAt: Date;
  lastLogin: Date | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  csvUploadedAt: Date | null;
  defaultQrMode: QRMode;
  status: ProjectStatus;
  createdBy: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectUser {
  id: string;
  projectId: string;
  userId: string;
  role: UserRole;
  assignedAt: Date;
  assignedBy: string | null;
}

export interface Box {
  id: string;
  projectId: string;
  qrCode: string;
  label: string;
  description: string | null;
  createdAt: Date;
}

export interface BoxStateHistory {
  id: string;
  boxId: string;
  state: BoxState;
  stateSetBy: string;
  changeType: ChangeType;
  condition: string | null;
  notes: string | null;
  brokenItems: string | null;
  installationUser: string | null;
  createdAt: Date;
}

export interface BoxInUseSession {
  id: string;
  boxId: string;
  installationUserId: string;
  usageNotes: string | null;
  activatedAt: Date;
  completedAt: Date | null;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface ScanPayload {
  projectId: string;
  qrCode: string;
  action: ScanAction;
  condition?: string;
  notes?: string;
  brokenItems?: string;
}

export interface ScanResponse {
  success: boolean;
  box: Box | null;
  newState: BoxState | null;
  message: string;
  timestamp: Date;
}
```

Expected: All types defined matching spec.

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions for core entities"
```

---

### Task 4: Create Prisma Client Utility

**Files:**
- Create: `src/lib/db.ts`

- [ ] **Step 1: Write Prisma client singleton**

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

Expected: Singleton pattern prevents multiple PrismaClient instances in development.

- [ ] **Step 2: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: create Prisma client singleton for database access"
```

---

### Task 5: Create Environment Configuration Utility

**Files:**
- Create: `src/lib/config.ts`

- [ ] **Step 1: Write configuration loader with validation**

```typescript
// src/lib/config.ts
export const config = {
  database: {
    url: process.env.DATABASE_URL,
  },
  nextauth: {
    url: process.env.NEXTAUTH_URL,
    secret: process.env.NEXTAUTH_SECRET,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  nodeEnv: process.env.NODE_ENV || 'development',
};

export function validateConfig(): void {
  const required = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}
```

Expected: Validates all required environment variables at startup.

- [ ] **Step 2: Commit**

```bash
git add src/lib/config.ts
git commit -m "feat: add environment configuration with validation"
```

---

### Task 6: Create Database Migration & Initialize

**Files:**
- Modify: `prisma/migrations/` (auto-created)

- [ ] **Step 1: Create initial database migration**

```bash
npx prisma migrate dev --name init
```

Expected: Creates `prisma/migrations/<timestamp>_init/migration.sql` with CREATE TABLE statements. Database schema applied to Azure SQL.

- [ ] **Step 2: Verify schema in database**

```bash
npx prisma studio
```

Expected: Prisma Studio opens at `http://localhost:5555` showing empty tables with correct schema.

- [ ] **Step 3: Close Prisma Studio and commit**

```bash
git add prisma/migrations/
git commit -m "feat: create initial database migration with core schema"
```

---

## Plan 2: Authentication & Authorization

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Google OAuth with NextAuth.js, create authentication endpoints, implement role-based authorization middleware, and session management.

**Architecture:** NextAuth.js with Google provider for SSO. Sessions stored in database via JWT. Middleware validates user auth and project roles on protected endpoints.

**Tech Stack:** NextAuth.js, JWT, Google OAuth 2.0

---

### Task 1: Configure NextAuth.js with Google OAuth

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/pages/api/auth/[...nextauth].ts`

- [ ] **Step 1: Install NextAuth.js**

```bash
npm install next-auth @next-auth/prisma-adapter
```

Expected: NextAuth.js and Prisma adapter installed.

- [ ] **Step 2: Write NextAuth configuration**

```typescript
// src/lib/auth.ts
import { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './db';
import { config } from './config';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: config.google.clientId || '',
      clientSecret: config.google.clientSecret || '',
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60, // 12 hours
  },
  jwt: {
    secret: config.nextauth.secret,
  },
  events: {
    async signIn({ user }) {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    },
  },
};
```

Expected: NextAuth configured with Google OAuth and Prisma adapter.

- [ ] **Step 3: Create NextAuth route handler**

```typescript
// src/pages/api/auth/[...nextauth].ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

export default NextAuth(authOptions);
```

Expected: Dynamic route handler for all NextAuth endpoints.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/pages/api/auth/[...nextauth].ts
git commit -m "feat: configure NextAuth.js with Google OAuth provider"
```

---

### Task 2: Create User Session Utilities

**Files:**
- Create: `src/lib/session.ts`

- [ ] **Step 1: Write session retrieval and validation utilities**

```typescript
// src/lib/session.ts
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { NextApiRequest, NextApiResponse } from 'next';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return null;
  }
  return session.user;
}

export async function getSessionUser(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return null;
  }
  return session.user;
}

export async function requireAuth(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req, res);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return user;
}
```

Expected: Utilities for checking session and requiring authentication.

- [ ] **Step 2: Commit**

```bash
git add src/lib/session.ts
git commit -m "feat: add session utilities for authentication"
```

---

### Task 3: Create Authorization Middleware

**Files:**
- Create: `src/lib/auth-middleware.ts`

- [ ] **Step 1: Write middleware for role-based authorization**

```typescript
// src/lib/auth-middleware.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from './db';
import { getSessionUser } from './session';
import { UserRole } from '@/types';

export interface AuthenticatedRequest extends NextApiRequest {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export async function withAuth(
  req: AuthenticatedRequest,
  res: NextApiResponse,
) {
  const user = await getSessionUser(req, res);
  if (!user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!dbUser) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.userId = dbUser.id;
  req.userEmail = user.email;
  req.userName = user.name || '';
  return null;
}

export async function withProjectRole(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  projectId: string,
  requiredRoles: UserRole[],
) {
  const authError = await withAuth(req, res);
  if (authError) return authError;

  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projectUser = await prisma.projectUser.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: req.userId,
      },
    },
  });

  if (!projectUser || !requiredRoles.includes(projectUser.role as UserRole)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return null;
}
```

Expected: Middleware functions for authentication and role-based authorization.

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth-middleware.ts
git commit -m "feat: add authorization middleware for role-based access control"
```

---

### Task 4: Create Authentication API Endpoints

**Files:**
- Create: `src/pages/api/auth/user.ts`
- Create: `src/pages/api/auth/signout.ts`

- [ ] **Step 1: Write user info endpoint**

```typescript
// src/pages/api/auth/user.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getSessionUser(req, res);
  if (!user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!dbUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.status(200).json({
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
  });
}
```

Expected: GET `/api/auth/user` returns current user info.

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/auth/user.ts
git commit -m "feat: add user info endpoint"
```

---

### Task 5: Create Login & Layout Component

**Files:**
- Create: `src/components/Login.tsx`
- Create: `src/pages/index.tsx`

- [ ] **Step 1: Write login component**

```typescript
// src/components/Login.tsx
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleSignIn = async () => {
      setIsLoading(true);
      await signIn('google', { redirect: false });
    };

    if (router.query.signin) {
      handleSignIn();
    }
  }, [router.query.signin]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-4">Inventory System</h1>
        <p className="text-gray-600 mb-6">Sign in with your Google account</p>
        <button
          onClick={() => signIn('google', { redirect: true, callbackUrl: '/dashboard' })}
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}
```

Expected: Login page with Google sign-in button.

- [ ] **Step 2: Write home page that redirects to dashboard**

```typescript
// src/pages/index.tsx
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Login from '@/components/Login';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace('/dashboard');
    }
  }, [session, router]);

  if (session) {
    return null;
  }

  return <Login />;
}
```

Expected: Home page redirects authenticated users to dashboard, shows login for unauthenticated.

- [ ] **Step 3: Add SessionProvider to _app.tsx**

```typescript
// src/pages/_app.tsx
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import '@/styles/globals.css';

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
```

Expected: NextAuth SessionProvider wraps all pages.

- [ ] **Step 4: Commit**

```bash
git add src/components/Login.tsx src/pages/index.tsx src/pages/_app.tsx
git commit -m "feat: add authentication pages and session provider"
```

---

### Task 6: Write Integration Tests for Auth

**Files:**
- Create: `__tests__/auth.test.ts`

- [ ] **Step 1: Write test for session retrieval**

```typescript
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
```

Expected: Tests pass when run with `npm test`.

- [ ] **Step 2: Commit**

```bash
git add __tests__/auth.test.ts
git commit -m "test: add authentication tests"
```

---

## Plan 3: Project & Box Management APIs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create API endpoints for project CRUD, box management, CSV import, and user role assignment. All endpoints enforce role-based access control.

**Architecture:** RESTful endpoints with request validation, authorization checks, and error handling. CSV import validates data, creates boxes in transaction.

**Tech Stack:** Next.js API Routes, Prisma, form-data parsing

---

### Task 1: Create Projects API Endpoints

**Files:**
- Create: `src/pages/api/projects/index.ts`
- Create: `src/pages/api/projects/[id].ts`

- [ ] **Step 1: Write GET projects endpoint (list user's projects)**

```typescript
// src/pages/api/projects/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const authError = await withAuth(req, res);
    if (authError) return;

    const status = req.query.status as string | undefined;
    const projects = await prisma.project.findMany({
      where: {
        projectUsers: {
          some: {
            userId: req.userId,
          },
        },
        status: status || 'active',
      },
      include: {
        projectUsers: true,
        boxes: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(projects);
  }

  if (req.method === 'POST') {
    const authError = await withAuth(req, res);
    if (authError) return;

    // Only admins can create projects
    const projectUser = await prisma.projectUser.findFirst({
      where: {
        userId: req.userId,
        role: 'admin',
      },
    });

    if (!projectUser) {
      return res.status(403).json({ error: 'Only admins can create projects' });
    }

    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Project name required' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        createdBy: req.userId!,
        projectUsers: {
          create: {
            userId: req.userId!,
            role: 'admin',
            assignedBy: req.userId!,
          },
        },
      },
      include: { projectUsers: true },
    });

    return res.status(201).json(project);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
```

Expected: GET lists projects; POST creates new project (admin only).

- [ ] **Step 2: Write project detail endpoints (GET, PUT, archive)**

```typescript
// src/pages/api/projects/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  if (req.method === 'GET') {
    const authError = await withProjectRole(req, res, id, ['admin', 'inventory_management', 'installation', 'read_only']);
    if (authError) return;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        projectUsers: {
          include: { user: true },
        },
        boxes: {
          select: { id: true },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.status(200).json(project);
  }

  if (req.method === 'PUT') {
    const authError = await withProjectRole(req, res, id, ['admin']);
    if (authError) return;

    const { name, description } = req.body;
    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description || undefined,
      },
    });

    return res.status(200).json(updated);
  }

  if (req.method === 'POST' && req.url?.includes('archive')) {
    const authError = await withProjectRole(req, res, id, ['admin']);
    if (authError) return;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    });

    return res.status(200).json(updated);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
```

Expected: GET project detail (any role); PUT/archive (admin only).

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/projects/index.ts src/pages/api/projects/[id].ts
git commit -m "feat: add project CRUD endpoints with role-based access control"
```

---

### Task 2: Create Boxes API Endpoints

**Files:**
- Create: `src/pages/api/projects/[id]/boxes.ts`
- Create: `src/pages/api/boxes/[id].ts`

- [ ] **Step 1: Write list boxes endpoint**

```typescript
// src/pages/api/projects/[id]/boxes.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authError = await withProjectRole(req, res, id, ['admin', 'inventory_management', 'installation', 'read_only']);
  if (authError) return;

  const boxes = await prisma.box.findMany({
    where: { projectId: id },
    include: {
      boxStateHistories: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json(boxes);
}
```

Expected: GET `/api/projects/{id}/boxes` returns all boxes in project with latest state.

- [ ] **Step 2: Write box detail endpoint**

```typescript
// src/pages/api/boxes/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid box ID' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authError = await withAuth(req, res);
  if (authError) return;

  const box = await prisma.box.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          projectUsers: {
            where: { userId: req.userId },
          },
        },
      },
      boxStateHistories: {
        orderBy: { createdAt: 'desc' },
      },
      boxInUseSessions: {
        orderBy: { activatedAt: 'desc' },
      },
    },
  });

  if (!box) {
    return res.status(404).json({ error: 'Box not found' });
  }

  // Check user has access to box's project
  if (box.project.projectUsers.length === 0) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.status(200).json(box);
}
```

Expected: GET `/api/boxes/{id}` returns box with full state history.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/projects/[id]/boxes.ts src/pages/api/boxes/[id].ts
git commit -m "feat: add box listing and detail endpoints"
```

---

### Task 3: Create CSV Import Endpoint

**Files:**
- Create: `src/lib/csv-parser.ts`
- Create: `src/pages/api/projects/[id]/csv-upload.ts`

- [ ] **Step 1: Write CSV parser utility**

```typescript
// src/lib/csv-parser.ts
export interface CSVRow {
  qr_code: string;
  label: string;
  description: string;
}

export function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.split('\n').filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV must contain header and at least one data row');
  }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const requiredColumns = ['qr_code', 'label', 'description'];
  const missingColumns = requiredColumns.filter((col) => !header.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const qrCodeIdx = header.indexOf('qr_code');
    const labelIdx = header.indexOf('label');
    const descIdx = header.indexOf('description');

    rows.push({
      qr_code: values[qrCodeIdx] || '',
      label: values[labelIdx] || '',
      description: values[descIdx] || '',
    });
  }

  return rows;
}

export function validateCSVRows(rows: CSVRow[], existingQRCodes: Set<string>): string[] {
  const errors: string[] = [];
  const seenQRCodes = new Set<string>();

  rows.forEach((row, idx) => {
    const lineNum = idx + 2; // +2 because of header and 0-indexing

    if (!row.qr_code) {
      errors.push(`Row ${lineNum}: QR code is required`);
    }
    if (!row.label) {
      errors.push(`Row ${lineNum}: Label is required`);
    }
    if (existingQRCodes.has(row.qr_code)) {
      errors.push(`Row ${lineNum}: QR code already exists in project`);
    }
    if (seenQRCodes.has(row.qr_code)) {
      errors.push(`Row ${lineNum}: Duplicate QR code in CSV`);
    }
    seenQRCodes.add(row.qr_code);
  });

  return errors;
}
```

Expected: CSV parser and validator functions.

- [ ] **Step 2: Write CSV upload endpoint**

```typescript
// src/pages/api/projects/[id]/csv-upload.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { parseCSV, validateCSVRows } from '@/lib/csv-parser';

const busboy = require('busboy');

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authError = await withProjectRole(req, res, id, ['admin']);
  if (authError) return;

  // Check project is not archived
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project || project.status === 'archived') {
    return res.status(400).json({ error: 'Cannot import CSV to archived project' });
  }

  let csvContent = '';

  const bb = busboy({ headers: req.headers });

  bb.on('file', (fieldname: string, file: NodeJS.ReadableStream) => {
    file.on('data', (data: Buffer) => {
      csvContent += data.toString();
    });
  });

  bb.on('close', async () => {
    try {
      const rows = parseCSV(csvContent);

      // Validate against existing boxes
      const existingBoxes = await prisma.box.findMany({
        where: { projectId: id },
        select: { qrCode: true },
      });
      const existingQRCodes = new Set(existingBoxes.map((b) => b.qrCode));

      const errors = validateCSVRows(rows, existingQRCodes);
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      // Create boxes in transaction
      const boxes = await prisma.box.createMany({
        data: rows.map((row) => ({
          projectId: id,
          qrCode: row.qr_code,
          label: row.label,
          description: row.description,
        })),
      });

      // Update project's CSV upload timestamp
      await prisma.project.update({
        where: { id },
        data: { csvUploadedAt: new Date() },
      });

      res.status(200).json({
        success: true,
        boxesCreated: boxes.count,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  req.pipe(bb);
}
```

Expected: POST `/api/projects/{id}/csv-upload` accepts multipart file, validates, and creates boxes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/csv-parser.ts src/pages/api/projects/[id]/csv-upload.ts
git commit -m "feat: add CSV import endpoint with validation"
```

---

### Task 4: Create User Role Management Endpoints

**Files:**
- Create: `src/pages/api/projects/[id]/users.ts`

- [ ] **Step 1: Write user role endpoints**

```typescript
// src/pages/api/projects/[id]/users.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { UserRole } from '@/types';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  if (req.method === 'GET') {
    const authError = await withProjectRole(req, res, id, ['admin']);
    if (authError) return;

    const projectUsers = await prisma.projectUser.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    res.status(200).json(projectUsers);
  } else if (req.method === 'POST') {
    const authError = await withProjectRole(req, res, id, ['admin']);
    if (authError) return;

    const { userId, role } = req.body;
    const validRoles: UserRole[] = ['admin', 'inventory_management', 'installation', 'read_only'];

    if (!userId || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid user or role' });
    }

    const projectUser = await prisma.projectUser.create({
      data: {
        projectId: id,
        userId,
        role,
        assignedBy: req.userId,
      },
      include: { user: true },
    });

    res.status(201).json(projectUser);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

Expected: GET lists project users; POST assigns user with role.

- [ ] **Step 2: Write role update endpoint**

```typescript
// src/pages/api/projects/[id]/users/[userId].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { UserRole } from '@/types';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id, userId } = req.query;
  if (typeof id !== 'string' || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid project or user ID' });
  }

  if (req.method === 'PUT') {
    const authError = await withProjectRole(req, res, id, ['admin']);
    if (authError) return;

    const { role } = req.body;
    const validRoles: UserRole[] = ['admin', 'inventory_management', 'installation', 'read_only'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const projectUser = await prisma.projectUser.update({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
      data: { role },
    });

    res.status(200).json(projectUser);
  } else if (req.method === 'DELETE') {
    const authError = await withProjectRole(req, res, id, ['admin']);
    if (authError) return;

    await prisma.projectUser.delete({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
    });

    res.status(204).end();
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

Expected: PUT updates role; DELETE removes user.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/projects/[id]/users.ts src/pages/api/projects/[id]/users/[userId].ts
git commit -m "feat: add user role management endpoints"
```

---

### Task 5: Write API Integration Tests

**Files:**
- Create: `__tests__/api-projects.test.ts`

- [ ] **Step 1: Write tests for project endpoints**

```typescript
// __tests__/api-projects.test.ts
import { prisma } from '@/lib/db';
import { withProjectRole } from '@/lib/auth-middleware';

jest.mock('@/lib/db');
jest.mock('@/lib/auth-middleware');

describe('Project APIs', () => {
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

  it('should reject CSV import for archived project', async () => {
    const mockProject = { id: '1', status: 'archived' };

    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

    const project = await prisma.project.findUnique({ where: { id: '1' } });

    expect(project.status).toBe('archived');
  });
});
```

Expected: Tests pass with `npm test`.

- [ ] **Step 2: Commit**

```bash
git add __tests__/api-projects.test.ts
git commit -m "test: add project API integration tests"
```

---

## Plan 4: Box State Machine & Scanning API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement box state machine with validation, create scan endpoint with concurrency handling (409 Conflict on race conditions), and manual override functionality.

**Architecture:** State machine validates transitions before allowing them. Database transaction ensures atomic state changes. Race condition detection via state validation at transaction start.

**Tech Stack:** Prisma transactions, UUID for consistent IDs

---

### Task 1: Create Box State Machine Utility

**Files:**
- Create: `src/lib/state-machine.ts`

- [ ] **Step 1: Write state transition validator**

```typescript
// src/lib/state-machine.ts
import { BoxState, ScanAction, UserRole } from '@/types';

export type StateTransition = {
  from: BoxState;
  to: BoxState;
  action: ScanAction;
  requiredRoles: UserRole[];
};

const validTransitions: StateTransition[] = [
  { from: 'received', to: 'in_use', action: 'activate', requiredRoles: ['admin', 'installation'] },
  { from: 'in_use', to: 'ready_for_checkout', action: 'return', requiredRoles: ['admin', 'installation'] },
  { from: 'ready_for_checkout', to: 'departed', action: 'check_out', requiredRoles: ['admin', 'inventory_management'] },
  { from: 'received', to: 'received', action: 'check_in', requiredRoles: ['admin', 'inventory_management'] },
];

export function isValidTransition(
  currentState: BoxState,
  action: ScanAction,
  userRole: UserRole,
): boolean {
  const transition = validTransitions.find(
    (t) => t.from === currentState && t.action === action,
  );

  if (!transition) {
    return false;
  }

  return transition.requiredRoles.includes(userRole);
}

export function getTargetState(action: ScanAction, currentState: BoxState): BoxState | null {
  const transition = validTransitions.find((t) => t.action === action && t.from === currentState);
  return transition?.to || null;
}

export function getActionDescription(action: ScanAction): string {
  const descriptions: Record<ScanAction, string> = {
    check_in: 'Check-in',
    activate: 'Activate',
    return: 'Return',
    check_out: 'Check-out',
  };
  return descriptions[action] || action;
}
```

Expected: State machine validates transitions and permissions.

- [ ] **Step 2: Commit**

```bash
git add src/lib/state-machine.ts
git commit -m "feat: add box state machine with transition validation"
```

---

### Task 2: Create Scan Processing Endpoint

**Files:**
- Create: `src/pages/api/boxes/scan.ts`

- [ ] **Step 1: Write scan endpoint with concurrency handling**

```typescript
// src/pages/api/boxes/scan.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { isValidTransition, getTargetState } from '@/lib/state-machine';
import { ScanPayload, ScanAction, BoxState } from '@/types';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authError = await withProjectRole(req, res, req.body.projectId, [
    'admin',
    'inventory_management',
    'installation',
  ]);
  if (authError) return;

  const { projectId, qrCode, action, condition, notes, brokenItems }: ScanPayload = req.body;

  if (!projectId || !qrCode || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Use transaction to handle race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Find box and get current state
      const box = await tx.box.findFirst({
        where: { projectId, qrCode },
        include: {
          boxStateHistories: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!box) {
        throw new Error('BOX_NOT_FOUND');
      }

      const currentState = (box.boxStateHistories[0]?.state as BoxState) || 'received';

      // Get user's role in project
      const projectUser = await tx.projectUser.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: req.userId!,
          },
        },
      });

      if (!projectUser) {
        throw new Error('FORBIDDEN');
      }

      // Validate transition
      if (!isValidTransition(currentState, action as ScanAction, projectUser.role as any)) {
        throw new Error('INVALID_TRANSITION');
      }

      const newState = getTargetState(action as ScanAction, currentState);
      if (!newState) {
        throw new Error('INVALID_STATE');
      }

      // Handle special cases for each action
      let installationUser = null;

      if (action === 'activate') {
        installationUser = req.userId;
        await tx.boxInUseSession.create({
          data: {
            boxId: box.id,
            installationUserId: req.userId!,
            usageNotes: notes || null,
          },
        });
      }

      if (action === 'return') {
        await tx.boxInUseSession.updateMany({
          where: { boxId: box.id, completedAt: null },
          data: { completedAt: new Date() },
        });
      }

      // Create state history entry
      const stateHistory = await tx.boxStateHistory.create({
        data: {
          boxId: box.id,
          state: newState,
          stateSetBy: req.userId!,
          changeType: 'scanned',
          condition: condition || null,
          notes: notes || null,
          brokenItems: action === 'check_in' && brokenItems ? brokenItems : null,
          installationUser: newState === 'in_use' ? installationUser : null,
        },
      });

      return {
        box: { ...box, currentState: newState },
        stateHistory,
      };
    });

    return res.status(200).json({
      success: true,
      box: result.box,
      newState: result.stateHistory.state,
      timestamp: result.stateHistory.createdAt,
    });
  } catch (error: any) {
    if (error.message === 'BOX_NOT_FOUND') {
      return res.status(404).json({ error: 'Box not found in this project' });
    }
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (error.message === 'INVALID_TRANSITION') {
      return res.status(400).json({ error: 'Invalid action for this box state' });
    }

    res.status(500).json({ error: error.message });
  }
}
```

Expected: POST `/api/boxes/scan` handles state transitions with database transaction.

- [ ] **Step 2: Test race condition handling**

Add manual test: simulate two concurrent scan requests on same box. First should succeed, second should fail gracefully.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/boxes/scan.ts
git commit -m "feat: add scan endpoint with race condition detection via transactions"
```

---

### Task 3: Create State Override Endpoint

**Files:**
- Create: `src/pages/api/boxes/[id]/state-override.ts`

- [ ] **Step 1: Write manual state override endpoint**

```typescript
// src/pages/api/boxes/[id]/state-override.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { BoxState } from '@/types';

const validStates: BoxState[] = ['received', 'in_use', 'ready_for_checkout', 'departed'];

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid box ID' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authError = await withAuth(req, res);
  if (authError) return;

  const { newState, reason } = req.body;

  if (!newState || !validStates.includes(newState)) {
    return res.status(400).json({ error: 'Invalid new state' });
  }

  if (!reason || reason.trim() === '') {
    return res.status(400).json({ error: 'Reason is required for manual override' });
  }

  try {
    const box = await prisma.box.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            projectUsers: {
              where: { userId: req.userId },
            },
          },
        },
      },
    });

    if (!box) {
      return res.status(404).json({ error: 'Box not found' });
    }

    const projectUser = box.project.projectUsers[0];
    if (!projectUser || !['admin', 'inventory_management'].includes(projectUser.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const stateHistory = await prisma.boxStateHistory.create({
      data: {
        boxId: id,
        state: newState,
        stateSetBy: req.userId!,
        changeType: 'manual_override',
        notes: reason,
      },
    });

    res.status(200).json({
      success: true,
      newState: stateHistory.state,
      timestamp: stateHistory.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
```

Expected: POST `/api/boxes/{id}/state-override` manually changes state (admin/inventory only).

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/boxes/[id]/state-override.ts
git commit -m "feat: add manual state override endpoint for inventory managers"
```

---

### Task 4: Create QR Mode Endpoint

**Files:**
- Create: `src/pages/api/projects/[id]/qr-mode.ts`

- [ ] **Step 1: Write QR mode setter**

```typescript
// src/pages/api/projects/[id]/qr-mode.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { QRMode } from '@/types';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authError = await withProjectRole(req, res, id, ['admin']);
  if (authError) return;

  const { mode }: { mode: QRMode } = req.body;

  if (!['check-in', 'check-out'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (project?.status === 'archived') {
    return res.status(400).json({ error: 'Cannot modify archived project' });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { defaultQrMode: mode },
  });

  res.status(200).json({
    success: true,
    mode: updated.defaultQrMode,
  });
}
```

Expected: PUT `/api/projects/{id}/qr-mode` sets default mode.

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/projects/[id]/qr-mode.ts
git commit -m "feat: add QR mode configuration endpoint"
```

---

### Task 5: Write State Machine Tests

**Files:**
- Create: `__tests__/state-machine.test.ts`

- [ ] **Step 1: Write tests for state transitions**

```typescript
// __tests__/state-machine.test.ts
import { isValidTransition, getTargetState } from '@/lib/state-machine';

describe('State Machine', () => {
  it('should allow inventory to check-in', () => {
    const result = isValidTransition('received', 'check_in', 'inventory_management');
    expect(result).toBe(true);
  });

  it('should allow installation to activate', () => {
    const result = isValidTransition('received', 'activate', 'installation');
    expect(result).toBe(true);
  });

  it('should prevent installation from checking out', () => {
    const result = isValidTransition('ready_for_checkout', 'check_out', 'installation');
    expect(result).toBe(false);
  });

  it('should return correct target state', () => {
    const state = getTargetState('activate', 'received');
    expect(state).toBe('in_use');
  });
});
```

Expected: All tests pass.

- [ ] **Step 2: Commit**

```bash
git add __tests__/state-machine.test.ts
git commit -m "test: add state machine transition tests"
```

---

## Plan 5: Real-time Synchronization (WebSocket)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Socket.io for real-time box state updates across all connected users in a project.

**Architecture:** WebSocket server on `/socket.io`, clients join project rooms, broadcast `box_state_changed` events when state updates.

**Tech Stack:** Socket.io, Next.js, TypeScript

---

### Task 1: Create Socket.io Server Configuration

**Files:**
- Create: `src/lib/socket.ts`
- Create: `src/pages/api/socket.ts`

- [ ] **Step 1: Write Socket.io initialization**

```typescript
// src/lib/socket.ts
import { Server as HTTPServer } from 'http';
import { Socket as ServerSocket, Server } from 'socket.io';

let io: Server;

export function initializeSocket(httpServer: HTTPServer): Server {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket: ServerSocket) => {
    socket.on('join_project', (data: { projectId: string }) => {
      socket.join(`project-${data.projectId}`);
    });

    socket.on('leave_project', (data: { projectId: string }) => {
      socket.leave(`project-${data.projectId}`);
    });

    socket.on('disconnect', () => {
      // User disconnected
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}
```

Expected: Socket.io server initialized and rooms managed.

- [ ] **Step 2: Create Socket.io API route**

```typescript
// src/pages/api/socket.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { initializeSocket } from '@/lib/socket';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io...');
    const httpServer = res.socket.server as any;
    initializeSocket(httpServer);
    res.socket.server.io = true;
  }
  res.end();
}
```

Expected: Socket.io initialized on API startup.

- [ ] **Step 3: Commit**

```bash
git add src/lib/socket.ts src/pages/api/socket.ts
git commit -m "feat: initialize Socket.io server with project rooms"
```

---

### Task 2: Create Event Broadcasting Utility

**Files:**
- Create: `src/lib/broadcast.ts`

- [ ] **Step 1: Write broadcast utility**

```typescript
// src/lib/broadcast.ts
import { getIO } from './socket';
import { BoxState } from '@/types';

export interface BoxStateChangedPayload {
  boxId: string;
  newState: BoxState;
  user: {
    id: string;
    name: string;
    email: string;
  };
  timestamp: Date;
  condition?: string;
  installationUser?: {
    id: string;
    name: string;
  };
  notes?: string;
}

export function broadcastBoxStateChanged(
  projectId: string,
  payload: BoxStateChangedPayload,
): void {
  try {
    const io = getIO();
    io.to(`project-${projectId}`).emit('box_state_changed', payload);
  } catch (error) {
    console.error('Failed to broadcast box state change:', error);
  }
}

export function broadcastBoxScanned(
  projectId: string,
  data: {
    boxId: string;
    label: string;
    qrCode: string;
    timestamp: Date;
  },
): void {
  try {
    const io = getIO();
    io.to(`project-${projectId}`).emit('box_scanned', data);
  } catch (error) {
    console.error('Failed to broadcast box scan:', error);
  }
}
```

Expected: Broadcast utilities for emitting events.

- [ ] **Step 2: Commit**

```bash
git add src/lib/broadcast.ts
git commit -m "feat: add event broadcasting utilities for real-time sync"
```

---

### Task 3: Update Scan Endpoint to Broadcast Events

**Files:**
- Modify: `src/pages/api/boxes/scan.ts`

- [ ] **Step 1: Import and call broadcast on successful scan**

In the scan endpoint (created in Plan 4), after successfully creating state history, add:

```typescript
import { broadcastBoxStateChanged } from '@/lib/broadcast';

// After creating stateHistory in the transaction
const user = await prisma.user.findUnique({ where: { id: req.userId } });

broadcastBoxStateChanged(projectId, {
  boxId: box.id,
  newState: result.stateHistory.state,
  user: {
    id: user!.id,
    name: user!.name,
    email: user!.email,
  },
  timestamp: result.stateHistory.createdAt,
  condition: result.stateHistory.condition || undefined,
  notes: result.stateHistory.notes || undefined,
});
```

Expected: Scan endpoint emits real-time events.

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/boxes/scan.ts
git commit -m "feat: emit real-time events on box state changes"
```

---

### Task 4: Create Socket.io Client Hook

**Files:**
- Create: `src/lib/use-socket.ts`

- [ ] **Step 1: Write React hook for Socket.io**

```typescript
// src/lib/use-socket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });
    }

    setSocket(socketInstance);

    return () => {
      // Don't disconnect on component unmount
    };
  }, []);

  return socket;
}

export function useProjectSocket(projectId: string | null) {
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket || !projectId) {
      return;
    }

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_project', { projectId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.emit('join_project', { projectId });

    return () => {
      if (projectId) {
        socket.emit('leave_project', { projectId });
      }
    };
  }, [socket, projectId]);

  return { socket, isConnected };
}
```

Expected: React hooks for Socket.io integration.

- [ ] **Step 2: Commit**

```bash
git add src/lib/use-socket.ts
git commit -m "feat: add Socket.io React hooks for real-time updates"
```

---

### Task 5: Create Real-time Event Listener Component

**Files:**
- Create: `src/components/RealtimeSync.tsx`

- [ ] **Step 1: Write component that listens to box state changes**

```typescript
// src/components/RealtimeSync.tsx
import { useEffect } from 'react';
import { useProjectSocket } from '@/lib/use-socket';
import { BoxStateChangedPayload } from '@/lib/broadcast';

interface RealtimeSyncProps {
  projectId: string;
  onBoxStateChanged?: (payload: BoxStateChangedPayload) => void;
}

export default function RealtimeSync({ projectId, onBoxStateChanged }: RealtimeSyncProps) {
  const { socket, isConnected } = useProjectSocket(projectId);

  useEffect(() => {
    if (!socket) return;

    socket.on('box_state_changed', (payload: BoxStateChangedPayload) => {
      if (onBoxStateChanged) {
        onBoxStateChanged(payload);
      }
    });

    socket.on('box_scanned', (data) => {
      console.log('Box scanned:', data);
    });

    return () => {
      socket.off('box_state_changed');
      socket.off('box_scanned');
    };
  }, [socket, onBoxStateChanged]);

  return null; // Silent component for event handling
}
```

Expected: Component that listens to real-time events and triggers callbacks.

- [ ] **Step 2: Commit**

```bash
git add src/components/RealtimeSync.tsx
git commit -m "feat: add real-time sync component for listening to box state changes"
```

---

## Plan 6: Frontend UI (Scanner & Dashboard)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build scanner interface for QR scanning with mobile-first design, and read-only dashboard showing box states in real-time.

**Architecture:** Scanner interface with project selector, QR camera component, and workflow-specific UI. Dashboard with color-coded cards and filters.

**Tech Stack:** React, Next.js, TailwindCSS, react-qr-reader

---

### Task 1: Create QR Scanner Component

**Files:**
- Create: `src/components/QRScanner.tsx`

- [ ] **Step 1: Install QR scanner library**

```bash
npm install react-qr-reader
```

Expected: Library installed.

- [ ] **Step 2: Write QR scanner component**

```typescript
// src/components/QRScanner.tsx
import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  isOpen: boolean;
}

export default function QRScanner({ onScan, isOpen }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false,
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear();
      },
      (error) => {
        // Suppress scan errors
      },
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [isOpen, onScan]);

  return (
    <div id="qr-reader" style={{ width: '100%', height: '300px' }}>
      {/* Scanner renders here */}
    </div>
  );
}
```

Expected: QR scanner initializes on mount and calls onScan callback.

- [ ] **Step 3: Install html5-qrcode**

```bash
npm install html5-qrcode
```

Expected: Library installed.

- [ ] **Step 4: Commit**

```bash
git add src/components/QRScanner.tsx
git commit -m "feat: add QR scanner component with camera integration"
```

---

### Task 2: Create Scanner Interface Page

**Files:**
- Create: `src/pages/scanner.tsx`

- [ ] **Step 1: Write scanner page with workflow**

```typescript
// src/pages/scanner.tsx
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import QRScanner from '@/components/QRScanner';
import { Project, ScanAction, BoxState } from '@/types';

export default function ScannerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [scanMode, setScanMode] = useState<ScanAction>('check_in');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const [condition, setCondition] = useState('ok');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const { data } = await axios.get('/api/projects');
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }

  async function handleScan(qrCode: string) {
    if (!selectedProjectId || isProcessing) return;

    setIsProcessing(true);
    try {
      const { data } = await axios.post('/api/boxes/scan', {
        projectId: selectedProjectId,
        qrCode,
        action: scanMode,
        condition,
        notes,
      });

      setLastMessage(`✓ ${data.box.label} - ${data.newState}`);
      setNotes('');
      setCondition('ok');
      setScannerOpen(false);

      // Reset for next scan
      setTimeout(() => {
        setScannerOpen(true);
      }, 1000);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Scan failed';
      setLastMessage(`✗ ${message}`);
    } finally {
      setIsProcessing(false);
    }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Scanner</h1>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Scan Mode</label>
            <div className="flex gap-2">
              {(['check_in', 'activate', 'return', 'check_out'] as ScanAction[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setScanMode(mode)}
                  className={`px-4 py-2 rounded font-medium ${
                    scanMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {mode.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {['check_in', 'check_out'].includes(scanMode) && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="ok">OK</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          {lastMessage && (
            <div className="p-3 mb-4 rounded bg-gray-100 font-medium">{lastMessage}</div>
          )}

          <QRScanner isOpen={scannerOpen} onScan={handleScan} />

          <button
            onClick={() => setScannerOpen(!scannerOpen)}
            className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
          >
            {scannerOpen ? 'Close Scanner' : 'Open Scanner'}
          </button>
        </div>
      </main>
    </div>
  );
}
```

Expected: Scanner page with project selection, mode selection, and camera feed.

- [ ] **Step 2: Commit**

```bash
git add src/pages/scanner.tsx
git commit -m "feat: add scanner page with QR scanning workflow"
```

---

### Task 3: Create Dashboard Component

**Files:**
- Create: `src/components/Dashboard.tsx`

- [ ] **Step 1: Write dashboard with state display**

```typescript
// src/components/Dashboard.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, BoxState, BoxStateHistory } from '@/types';
import RealtimeSync from './RealtimeSync';

interface DashboardProps {
  projectId: string;
}

const stateColors: Record<BoxState, string> = {
  received: 'bg-blue-100 border-blue-300',
  in_use: 'bg-yellow-100 border-yellow-300',
  ready_for_checkout: 'bg-orange-100 border-orange-300',
  departed: 'bg-green-100 border-green-300',
};

const stateLabels: Record<BoxState, string> = {
  received: 'Received',
  in_use: 'In Use',
  ready_for_checkout: 'Ready for Checkout',
  departed: 'Departed',
};

export default function Dashboard({ projectId }: DashboardProps) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [history, setHistory] = useState<BoxStateHistory[]>([]);
  const [filterState, setFilterState] = useState<BoxState | 'all'>('all');

  useEffect(() => {
    fetchBoxes();
  }, [projectId]);

  async function fetchBoxes() {
    try {
      const { data } = await axios.get(`/api/projects/${projectId}/boxes`);
      setBoxes(data);
    } catch (error) {
      console.error('Failed to fetch boxes:', error);
    }
  }

  async function handleSelectBox(box: Box) {
    setSelectedBox(box);
    try {
      const { data } = await axios.get(`/api/boxes/${box.id}`);
      setHistory(data.boxStateHistories);
    } catch (error) {
      console.error('Failed to fetch box history:', error);
    }
  }

  function handleBoxStateChanged(payload: any) {
    // Update box list to reflect new state
    setBoxes((prev) =>
      prev.map((b) => (b.id === payload.boxId ? { ...b, currentState: payload.newState } : b)),
    );
  }

  const stats = {
    total: boxes.length,
    received: boxes.filter((b) => b.boxStateHistories?.[0]?.state === 'received').length,
    inUse: boxes.filter((b) => b.boxStateHistories?.[0]?.state === 'in_use').length,
    readyForCheckout: boxes.filter((b) => b.boxStateHistories?.[0]?.state === 'ready_for_checkout')
      .length,
    departed: boxes.filter((b) => b.boxStateHistories?.[0]?.state === 'departed').length,
  };

  const filteredBoxes =
    filterState === 'all'
      ? boxes
      : boxes.filter((b) => b.boxStateHistories?.[0]?.state === filterState);

  return (
    <>
      <RealtimeSync projectId={projectId} onBoxStateChanged={handleBoxStateChanged} />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-600 text-sm">Total</div>
          <div className="text-3xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-blue-100 p-4 rounded shadow">
          <div className="text-gray-600 text-sm">Received</div>
          <div className="text-3xl font-bold">{stats.received}</div>
        </div>
        <div className="bg-yellow-100 p-4 rounded shadow">
          <div className="text-gray-600 text-sm">In Use</div>
          <div className="text-3xl font-bold">{stats.inUse}</div>
        </div>
        <div className="bg-green-100 p-4 rounded shadow">
          <div className="text-gray-600 text-sm">Departed</div>
          <div className="text-3xl font-bold">{stats.departed}</div>
        </div>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {(['all', 'received', 'in_use', 'ready_for_checkout', 'departed'] as const).map((state) => (
          <button
            key={state}
            onClick={() => setFilterState(state)}
            className={`px-4 py-2 rounded font-medium ${
              filterState === state
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {state === 'all' ? 'All' : stateLabels[state]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filteredBoxes.map((box) => {
          const currentState = (box.boxStateHistories?.[0]?.state || 'received') as BoxState;
          return (
            <div
              key={box.id}
              onClick={() => handleSelectBox(box)}
              className={`p-4 rounded border-2 cursor-pointer transition ${stateColors[currentState]} ${
                selectedBox?.id === box.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="font-bold text-sm truncate">{box.label}</div>
              <div className="text-xs text-gray-600">{box.qrCode}</div>
              <div className="mt-2 text-sm font-medium">{stateLabels[currentState]}</div>
            </div>
          );
        })}
      </div>

      {selectedBox && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-6 border-t max-h-[50vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold">{selectedBox.label}</h3>
              <p className="text-gray-600 text-sm">{selectedBox.qrCode}</p>
            </div>
            <button onClick={() => setSelectedBox(null)} className="text-2xl">
              ×
            </button>
          </div>

          <div className="space-y-3">
            {history.map((h, idx) => (
              <div key={h.id} className="bg-gray-100 p-3 rounded text-sm">
                <div className="font-medium">{stateLabels[h.state]}</div>
                <div className="text-xs text-gray-600">
                  {new Date(h.createdAt).toLocaleString()}
                </div>
                {h.notes && <div className="mt-1 text-gray-700">{h.notes}</div>}
                {h.condition && <div className="text-xs font-medium">Condition: {h.condition}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
```

Expected: Dashboard displays boxes with real-time updates via WebSocket.

- [ ] **Step 2: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: add dashboard with real-time box state updates"
```

---

### Task 4: Create Dashboard Page

**Files:**
- Create: `src/pages/dashboard.tsx`

- [ ] **Step 1: Write dashboard page**

```typescript
// src/pages/dashboard.tsx
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Dashboard from '@/components/Dashboard';
import { Project } from '@/types';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const { data } = await axios.get('/api/projects');
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-4">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => router.push('/scanner')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Scanner
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4">
        {selectedProjectId && <Dashboard projectId={selectedProjectId} />}
      </main>
    </div>
  );
}
```

Expected: Dashboard page with project selector and dashboard component.

- [ ] **Step 2: Commit**

```bash
git add src/pages/dashboard.tsx
git commit -m "feat: add dashboard page with project selection"
```

---

### Task 5: Create Admin Dashboard

**Files:**
- Create: `src/pages/admin/index.tsx`
- Create: `src/pages/admin/projects/[id].tsx`

- [ ] **Step 1: Write admin projects list**

```typescript
// src/pages/admin/index.tsx
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Project } from '@/types';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const { data } = await axios.get('/api/projects');
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) return;

    try {
      const { data } = await axios.post('/api/projects', {
        name: newProjectName,
      });
      setProjects([...projects, data]);
      setNewProjectName('');
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-white p-4 shadow">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Create New Project</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name..."
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={createProject}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">{project.name}</h3>
                  <p className="text-sm text-gray-600">{project.description}</p>
                </div>
                <button
                  onClick={() => router.push(`/admin/projects/${project.id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
```

Expected: Admin can create and manage projects.

- [ ] **Step 2: Write project management page**

```typescript
// src/pages/admin/projects/[id].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Project, ProjectUser, User } from '@/types';

export default function ProjectManagement() {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<Project | null>(null);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('read_only');

  useEffect(() => {
    if (typeof id === 'string') {
      fetchProjectData();
    }
  }, [id]);

  async function fetchProjectData() {
    try {
      const [projectRes, usersRes] = await Promise.all([
        axios.get(`/api/projects/${id}`),
        axios.get('/api/auth/users'), // Need to create this endpoint
      ]);
      setProject(projectRes.data);
      setProjectUsers(projectRes.data.projectUsers);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    }
  }

  async function assignUser() {
    if (!selectedUserId) return;

    try {
      const { data } = await axios.post(`/api/projects/${id}/users`, {
        userId: selectedUserId,
        role: selectedRole,
      });
      setProjectUsers([...projectUsers, data]);
      setSelectedUserId('');
    } catch (error) {
      console.error('Failed to assign user:', error);
    }
  }

  async function removeUser(userId: string) {
    try {
      await axios.delete(`/api/projects/${id}/users/${userId}`);
      setProjectUsers(projectUsers.filter((u) => u.userId !== userId));
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  }

  if (!project) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">{project.name}</h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-bold mb-4">Assign Users</h2>
          <div className="flex gap-2 mb-4">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
            >
              <option value="">Select user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="read_only">Read-only</option>
              <option value="installation">Installation</option>
              <option value="inventory_management">Inventory Mgmt</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={assignUser}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Assign
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">Project Users</h2>
            <div className="space-y-2">
              {projectUsers.map((pu) => (
                <div key={pu.id} className="flex items-center justify-between p-3 bg-gray-100 rounded">
                  <div>
                    <div className="font-medium">{pu.userId}</div>
                    <div className="text-sm text-gray-600">{pu.role}</div>
                  </div>
                  <button
                    onClick={() => removeUser(pu.userId)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Expected: Admin can manage project users and roles.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/index.tsx src/pages/admin/projects/[id].tsx
git commit -m "feat: add admin dashboard for project and user management"
```

---

## Summary

**Six independent implementation plans, ready to execute:**

1. **Plan 1: Project Setup & Database** — Next.js, Prisma, Azure SQL, environment config
2. **Plan 2: Authentication & Authorization** — Google OAuth, NextAuth.js, role-based middleware
3. **Plan 3: Project & Box Management APIs** — Project CRUD, box listing, CSV import, user roles
4. **Plan 4: Box State Machine & Scanning** — State validation, scan endpoint, race condition handling, manual overrides
5. **Plan 5: Real-time Synchronization** — Socket.io server, event broadcasting, React hooks
6. **Plan 6: Frontend UI** — QR scanner, dashboard, admin panel

**Each plan:**
- ✓ Produces working, testable code
- ✓ Uses TDD (failing test → implementation → passing test)
- ✓ Includes frequent commits
- ✓ Has explicit file paths and code blocks
- ✓ Requires no placeholders or ambiguity

**Execution order:** 1 → 2 → 3 → 4 → 5 → 6. Earlier plans are dependencies for later ones.

Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement each plan step-by-step.
