# Vercel Deployment Guide

## Overview

This application deploys to **Vercel** with **Prisma Postgres** as the managed database. Vercel provides automatic deployments, edge caching, serverless functions, and integrates seamlessly with Next.js.

**Key Benefits:**
- Zero-config deployment (push to GitHub → auto-deploy)
- Automatic HTTPS and CDN caching
- Serverless functions scale automatically
- Preview deployments for each pull request
- Integrated monitoring and logs

---

## Prerequisites

Before deploying, ensure you have:

1. **GitHub Account** — Repository must be pushed to GitHub
2. **Vercel Account** — Sign up at https://vercel.com (free tier available)
3. **Prisma Postgres Database** — Created at https://console.prisma.io
4. **Google OAuth Credentials** — Created at Google Cloud Console
5. **Environment Variables** — Ready to configure in Vercel

---

## Step 1: Create Prisma Postgres Database

### 1.1 Sign Up for Prisma Postgres

1. Go to https://console.prisma.io
2. Sign in with your account (or create one)
3. Click **"Create Database"**

### 1.2 Create Database Instance

1. **Name:** `qr-code-inventory` (or your project name)
2. **Region:** Choose closest to your users (e.g., US-EAST, EU-WEST)
3. **Plan:** Free tier (500 MB storage, suitable for MVP)
4. Click **"Create Database"**

### 1.3 Get Connection String

1. Once created, click your database name
2. Copy the **"Connection URL"** (looks like: `postgresql://user:password@host:5432/database?schema=public`)
3. Save this securely — you'll need it for Vercel configuration

### 1.4 Update Local .env.local

Replace the old Azure SQL connection string with your Prisma Postgres URL:

```bash
# .env.local
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-new-32-char-secret>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

### 1.5 Test Connection Locally

```bash
# Apply migrations to Prisma Postgres
npx prisma migrate dev

# Open Prisma Studio to verify database
npx prisma studio

# Run dev server
npm run dev
```

If successful, you should see the login page at http://localhost:3000 without errors.

---

## Step 2: Connect Repository to Vercel

### 2.1 Push Code to GitHub

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Update deployment strategy: Azure → Vercel + Prisma Postgres"
git push origin main
```

### 2.2 Create Vercel Project

1. Go to https://vercel.com/dashboard
2. Click **"New Project"**
3. Select **"Import Git Repository"**
4. Search for `qr-code-inventory-scanner`
5. Click **"Import"**

### 2.3 Configure Project Settings

**Build and Output Settings:**
- Framework Preset: Next.js (auto-detected)
- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)
- Install Command: `npm install` (default)

**Root Directory:**
- Leave as `.` (root)

Click **"Deploy"** — Vercel will build your first deployment.

---

## Step 3: Configure Environment Variables in Vercel

### 3.1 Set Environment Variables

1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add the following variables:

| Variable | Value | Environments |
|----------|-------|--------------|
| `DATABASE_URL` | Prisma Postgres connection URL | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://<your-vercel-domain>.vercel.app` | Production, Preview |
| `NEXTAUTH_URL` | `http://localhost:3000` | Development |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` | All |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | All |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | All |
| `NEXT_PUBLIC_API_URL` | Same as NEXTAUTH_URL | All |
| `NEXT_PUBLIC_SOCKET_URL` | Same as NEXTAUTH_URL | All |

**Important:** 
- For Preview/Production: Use your actual Vercel domain (visible in Vercel dashboard, e.g., `qr-code-inventory.vercel.app`)
- For Development: Use `http://localhost:3000`
- Copy exact values — typos will cause auth failures

### 3.2 Generate NEXTAUTH_SECRET

```bash
# Run locally and copy the output
openssl rand -base64 32
```

Paste this value into Vercel's NEXTAUTH_SECRET variable.

---

## Step 4: Update Google OAuth Redirect URIs

### 4.1 Get Your Vercel Domain

1. Go to your Vercel project → **"Settings"** → **"Domains"**
2. Your default domain is shown (e.g., `qr-code-inventory.vercel.app`)
3. Note this URL

### 4.2 Update Google Console

1. Go to https://console.cloud.google.com/
2. Select your OAuth 2.0 application
3. Click **"Edit OAuth consent screen"** or **"Credentials"**
4. Add authorized redirect URIs:
   - Dev: `http://localhost:3000/api/auth/callback/google`
   - Staging: `https://qr-code-inventory.vercel.app/api/auth/callback/google` (your preview domain)
   - Production: `https://yourdomain.com/api/auth/callback/google` (if using custom domain)

**Note:** Use your actual Vercel domain in the URL, not localhost (except for development).

---

## Step 5: Deploy and Verify

### 5.1 Trigger Deployment

Your deployment should have already started when you imported the repository. To manually trigger:

1. Go to your Vercel project → **"Deployments"**
2. Click **"Deploy"** button or push a new commit to GitHub

### 5.2 Monitor Build Progress

1. Watch the build log in real-time
2. Vercel will:
   - Clone your repo
   - Install dependencies (`npm install`)
   - Build Next.js app (`npm run build`)
   - Run postbuild script (`npx prisma migrate deploy`)
   - Deploy to edge network

3. Once complete, you'll see a **"Production"** deployment ready

### 5.3 Test the Application

1. Click the **"Production"** deployment URL
2. Verify the login page loads
3. Test Google OAuth login:
   - Click "Sign in with Google"
   - Complete authentication
   - Should redirect to dashboard
4. Test functionality:
   - Create a test project
   - View dashboard
   - Test QR scanner (if camera available)
   - Verify real-time updates

### 5.4 Check Application Logs

1. Go to Vercel project → **"Logs"**
2. Monitor for errors:
   - Database connection errors → Check DATABASE_URL
   - Auth errors → Check NEXTAUTH variables and Google OAuth settings
   - Build errors → Check `npm run build` locally first

---

## Step 6: Set Up Custom Domain (Optional)

### 6.1 Add Custom Domain

1. Go to project **"Settings"** → **"Domains"**
2. Click **"Add"**
3. Enter your domain (e.g., `inventory.yourdomain.com`)
4. Follow DNS configuration instructions

### 6.2 Update Environment Variables

Once domain is live, update Vercel environment variables:

```
NEXTAUTH_URL=https://inventory.yourdomain.com
NEXT_PUBLIC_API_URL=https://inventory.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://inventory.yourdomain.com
```

### 6.3 Update Google OAuth

Add your custom domain to Google Console authorized redirect URIs:
```
https://inventory.yourdomain.com/api/auth/callback/google
```

---

## Troubleshooting

### Build Fails: "Prisma migration failed"

**Problem:** Error during `npx prisma migrate deploy`

**Solution:**
1. Verify DATABASE_URL is correct in Vercel environment variables
2. Check Prisma Postgres database is running at console.prisma.io
3. View full error in Vercel logs
4. If needed, reset database and run migrations locally first:
   ```bash
   npx prisma migrate dev
   ```

### Login Page Shows: "useSession must be wrapped in SessionProvider"

**Problem:** Session provider error appears

**Solutions:**
1. Verify NEXTAUTH_URL is set correctly in Vercel (should match your Vercel domain)
2. Verify NEXTAUTH_SECRET is set
3. Check Google OAuth credentials are correct
4. Clear browser cache and try again
5. Consider upgrading NextAuth to v5 if persists

### Google OAuth Login Fails

**Problem:** Redirect URI mismatch or "Invalid Client"

**Solutions:**
1. Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
2. Check Google Console has correct redirect URI:
   - Should be: `https://your-vercel-domain.vercel.app/api/auth/callback/google`
   - Not: `http://localhost:...` (except for local dev)
3. Regenerate OAuth credentials if necessary
4. Wait 5-10 minutes for Google to propagate changes

### Database Connection Timeout

**Problem:** "Error: connect ECONNREFUSED" or timeout errors

**Solutions:**
1. Verify DATABASE_URL format: `postgresql://user:password@host:5432/database?schema=public`
2. Check Prisma Postgres is running at console.prisma.io
3. Verify your Vercel project can reach the database (no firewall blocking)
4. Test locally: `npx prisma studio` with same DATABASE_URL
5. Check Prisma Postgres connection limits (free tier has limits)

### WebSocket Connection Issues

**Problem:** Socket.io not connecting or real-time updates not working

**Solutions:**
1. Socket.io falls back to HTTP polling on Vercel (no persistent connections)
2. Verify NEXT_PUBLIC_SOCKET_URL matches your domain
3. Check browser console for Socket.io errors
4. Verify backend Socket.io server is running (`src/lib/socket.ts`)
5. Real-time updates may have 1-2 second latency (normal)

### Deployments Keep Failing

**Problem:** Multiple failed deployments in Vercel

**Solutions:**
1. Check "Recent Deployments" → failed deployment → click to see error details
2. Most common causes:
   - Missing or incorrect environment variables
   - Database connection issues
   - Schema mismatches
3. Fix locally and push new commit to trigger redeploy
4. Use preview deployments to test before production

---

## Monitoring and Maintenance

### Monitor Application Health

1. **Vercel Dashboard:** Check deployment status and build times
2. **Vercel Logs:** Monitor runtime errors and warnings
3. **Prisma Console:** Monitor database usage and connection pools
4. **Browser Console:** Check for JavaScript errors

### Update Environment Variables

If you need to change environment variables (e.g., new Google OAuth secret):

1. Go to Vercel project → **"Settings"** → **"Environment Variables"**
2. Update the variable value
3. Click **"Save"**
4. Go to **"Deployments"** and click **"Redeploy"** on latest production deployment
5. Vercel will rebuild with new variables

### Database Migrations

To add new tables or fields:

1. Update `prisma/schema.prisma` locally
2. Run `npx prisma migrate dev --name <name>` to create migration
3. Test locally
4. Commit and push to GitHub
5. Vercel automatically runs migrations via `postbuild` script on deploy

### Scaling Considerations

**Free Tier Limits:**
- Vercel: 100 GB bandwidth/month, 12 serverless function executions/second
- Prisma Postgres: 500 MB storage, reasonable for MVP

**When to upgrade:**
- > 100 GB data transfer/month → Vercel paid plan
- > 500 MB database size → Prisma Postgres paid plan
- Need higher concurrency → Upgrade Prisma connection pooling

---

## Rollback and Recovery

### Rollback to Previous Deployment

1. Go to Vercel project → **"Deployments"**
2. Find the previous working deployment
3. Click three dots (•••) → **"Promote to Production"**
4. Your app reverts to that previous version
5. Database remains unchanged (safe rollback)

### Database Rollback

Database changes are permanent. To rollback a schema change:

1. Create a new migration that reverts the change:
   ```bash
   npx prisma migrate dev --name revert_<change_name>
   ```
2. Test locally
3. Push to GitHub → Vercel deploys the revert migration
4. Verify application works with reverted schema

### Manual Database Reset (Last Resort)

⚠️ **Warning:** This deletes all data. Only use in development.

1. Go to Prisma Console (console.prisma.io)
2. Delete and recreate the database
3. Run `npx prisma migrate deploy` to reapply schema
4. Redeploy Vercel application

---

## Security Best Practices

### Protect Environment Variables

1. Never commit `.env.local` to GitHub (already in `.gitignore`)
2. Never share environment variable values via email/chat
3. Rotate secrets regularly (especially NEXTAUTH_SECRET)
4. Use strong NEXTAUTH_SECRET (32+ characters)
5. Keep Google OAuth secret confidential

### Manage Prisma Postgres Access

1. Prisma Postgres has built-in connection pooling
2. Vercel serverless functions reuse connections efficiently
3. Monitor connection pool at console.prisma.io
4. If hitting limits, consider:
   - Upgrading Prisma plan
   - Optimizing database queries
   - Adding indexes to frequently-queried columns

### Enable HTTPS Everywhere

Vercel provides free HTTPS:
1. All Vercel domains use HTTPS by default
2. Custom domains get free SSL certificate via Let's Encrypt
3. No additional configuration needed
4. Vercel auto-renews certificates

---

## Testing Before Production

### Test Preview Deployment

Create a test via pull request:

1. Create new branch: `git checkout -b test-feature`
2. Make changes and commit
3. Push to GitHub: `git push origin test-feature`
4. Open pull request on GitHub
5. Vercel automatically creates preview deployment
6. Test in preview before merging to main
7. Merge to main → promotes preview to production

### End-to-End Testing Checklist

Before considering production-ready, verify:

- [ ] Login page loads without errors
- [ ] Google OAuth login works
- [ ] Dashboard loads and fetches projects
- [ ] Can create/edit projects
- [ ] Can upload CSV with boxes
- [ ] QR scanner loads (if camera available)
- [ ] Scan creates state history entry
- [ ] Real-time updates appear on dashboard
- [ ] Role-based access control works (try different users)
- [ ] Admin panel functions work
- [ ] No console errors in browser
- [ ] Mobile-responsive on small screens
- [ ] Performance is acceptable (< 3 sec page load)

---

## Support and Resources

- **Vercel Docs:** https://vercel.com/docs
- **Prisma Postgres Docs:** https://www.prisma.io/docs/postgres
- **NextAuth.js Docs:** https://next-auth.js.org/
- **Next.js Docs:** https://nextjs.org/docs
- **Issues:** Report via GitHub Issues on the repository

---

## Summary

1. ✅ Create Prisma Postgres database (console.prisma.io)
2. ✅ Link GitHub to Vercel (vercel.com)
3. ✅ Configure environment variables in Vercel dashboard
4. ✅ Update Google OAuth redirect URIs
5. ✅ Test application at Vercel URL
6. ✅ Set up custom domain (optional)
7. ✅ Monitor logs and performance

**Your application is now deployed on Vercel with Prisma Postgres!** 🎉

Push to main branch anytime to auto-deploy changes. Vercel handles scaling, HTTPS, and migrations automatically.
