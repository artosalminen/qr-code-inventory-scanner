# Deployment & CI/CD Setup Guide

**Project:** Real-Time Inventory Tracking System  
**Infrastructure:** Azure (App Service, SQL Database, Container Registry)  
**CI/CD:** GitHub Actions  
**Environments:** Dev (MVP), Prod (future)

---

## 1. Azure Infrastructure Setup

### 1.1 Prerequisites

- Azure subscription (free offer covers database costs)
- Azure CLI installed locally
- GitHub personal access token
- Azure Container Registry

### 1.2 Create Azure Resource Group

```bash
az group create \
  --name inventory-dev-rg \
  --location eastus
```

### 1.3 Create Azure SQL Database (Free Offer)

```bash
# Create SQL Server (logical server)
az sql server create \
  --resource-group inventory-dev-rg \
  --name inventory-dev-server \
  --location eastus \
  --admin-user sqladmin \
  --admin-password YourSecurePassword123!

# Create free database
az sql db create \
  --resource-group inventory-dev-rg \
  --server inventory-dev-server \
  --name inventory_dev_db \
  --edition GeneralPurpose \
  --compute-model Serverless \
  --auto-pause-delay 60
  
# Open firewall for development (dev only - restrict in prod)
az sql server firewall-rule create \
  --resource-group inventory-dev-rg \
  --server inventory-dev-server \
  --name AllowDevAccess \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255
```

**Note:** For production, restrict firewall to specific IPs/Azure services only.

### 1.4 Create Azure Container Registry

```bash
az acr create \
  --resource-group inventory-dev-rg \
  --name inventorydevacr \
  --sku Basic
```

### 1.5 Create Azure App Service Plan

```bash
az appservice plan create \
  --name inventory-dev-plan \
  --resource-group inventory-dev-rg \
  --sku B1 \
  --is-linux
```

### 1.6 Create Azure App Service

```bash
az webapp create \
  --resource-group inventory-dev-rg \
  --plan inventory-dev-plan \
  --name inventory-dev-app \
  --deployment-container-image-name inventorydevacr.azurecr.io/inventory:latest
```

---

## 2. GitHub Repository Setup

### 2.1 Create GitHub Repository

1. Go to https://github.com/new
2. Create repository: `inventory-system`
3. Make it **private** (sensitive application)
4. Initialize with README
5. Add `.gitignore` for Node.js

### 2.2 Clone and Initialize Locally

```bash
git clone https://github.com/YOUR_USERNAME/inventory-system.git
cd inventory-system

# Initialize Node.js project
npm init -y

# Install dependencies
npm install next react react-dom
npm install -D typescript @types/node @types/react
npm install @prisma/client
npm install -D prisma
npm install next-auth
npm install socket.io socket.io-client
npm install dotenv

# Install dev dependencies
npm install -D @types/node ts-node
```

### 2.3 Project Structure

```
inventory-system/
├── .github/
│   └── workflows/
│       └── deploy-dev.yml
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── pages/
│   │   ├── index.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── projects/
│   │   │   ├── boxes/
│   │   │   └── users/
│   │   └── dashboard.tsx
│   ├── components/
│   ├── lib/
│   └── types/
├── public/
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 3. Docker Setup

### 3.1 Create Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci

# Build Next.js application
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Run migrations and start app
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations and start Next.js
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

### 3.2 Create .dockerignore

```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
README.md
.next
dist
.DS_Store
```

---

## 4. GitHub Secrets Setup

Add these secrets to GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

```
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
AZURE_RESOURCE_GROUP=inventory-dev-rg
AZURE_REGISTRY_NAME=inventorydevacr
AZURE_REGISTRY_USERNAME=<registry-username>
AZURE_REGISTRY_PASSWORD=<registry-password>
AZURE_WEBAPP_NAME=inventory-dev-app
DATABASE_URL=Server=inventory-dev-server.database.windows.net,1433;Database=inventory_dev_db;User ID=sqladmin;Password=YourSecurePassword123!;Encrypt=true;Connection Timeout=30;
NEXTAUTH_URL=https://inventory-dev-app.azurewebsites.net
NEXTAUTH_SECRET=<generate-random-secret>
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
```

**To generate NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

---

## 5. GitHub Actions CI/CD Workflow

### 5.1 Create Deploy Workflow

Create `.github/workflows/deploy-dev.yml`:

```yaml
name: Deploy to Dev

on:
  push:
    branches:
      - main
  workflow_dispatch:  # Allow manual trigger

env:
  REGISTRY: inventorydevacr.azurecr.io
  IMAGE_NAME: inventory
  TAG: latest

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      # Checkout code
      - name: Checkout code
        uses: actions/checkout@v4
        
      # Setup Node.js for schema validation
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      # Install dependencies
      - name: Install dependencies
        run: npm ci
        
      # Validate Prisma schema
      - name: Validate Prisma schema
        run: npx prisma validate
        
      # Run tests (optional, add as you develop)
      - name: Run tests
        run: npm run test --if-present
        
      # Login to Azure Container Registry
      - name: Login to Azure Container Registry
        uses: azure/docker-login@v1
        with:
          login-server: ${{ env.REGISTRY }}
          username: ${{ secrets.AZURE_REGISTRY_USERNAME }}
          password: ${{ secrets.AZURE_REGISTRY_PASSWORD }}
          
      # Build and push Docker image
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ env.TAG }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
          cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
          
      # Deploy to Azure App Service
      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v2
        with:
          app-name: ${{ secrets.AZURE_WEBAPP_NAME }}
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ env.TAG }}
          
      # Restart App Service (ensures migrations run)
      - name: Restart App Service
        uses: azure/CLI@v1
        with:
          azcliversion: latest
          inlineScript: |
            az webapp restart --name ${{ secrets.AZURE_WEBAPP_NAME }} --resource-group ${{ secrets.AZURE_RESOURCE_GROUP }}
            
      # Notification (optional)
      - name: Deployment successful
        if: success()
        run: echo "✅ Deployment to Dev completed successfully"
        
      - name: Deployment failed
        if: failure()
        run: echo "❌ Deployment failed - check logs above"
```

### 5.2 Add Build Script to package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest"
  }
}
```

---

## 6. Local Development Setup

### 6.1 Create .env.local

```
DATABASE_URL=Server=inventory-dev-server.database.windows.net,1433;Database=inventory_dev_db;User ID=sqladmin;Password=YourSecurePassword123!;Encrypt=true;Connection Timeout=30;
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your-generated-secret>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
NODE_ENV=development
```

### 6.2 Run Locally

```bash
# Run Prisma migrations
npx prisma migrate dev --name init

# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

### 6.3 Database Inspection

```bash
# Open Prisma Studio
npx prisma studio

# Query database directly
npx prisma db execute --stdin < query.sql
```

---

## 7. Deployment Process

### 7.1 Development Deployment (Automated)

**Every push to `main` branch:**

1. GitHub Actions triggered
2. Code validated & tests run
3. Docker image built and pushed to ACR
4. Image deployed to App Service
5. Migrations auto-run (in Dockerfile ENTRYPOINT)
6. App restarts

### 7.2 Manual Deployment

```bash
# Trigger workflow manually from GitHub UI
# Or via CLI:
gh workflow run deploy-dev.yml

# Monitor deployment
az webapp log tail --resource-group inventory-dev-rg --name inventory-dev-app
```

### 7.3 Verify Deployment

```bash
# Check app is running
curl https://inventory-dev-app.azurewebsites.net

# View logs
az webapp log show \
  --resource-group inventory-dev-rg \
  --name inventory-dev-app
```

---

## 8. Production Setup (Future)

When ready to move to production, follow this pattern:

### 8.1 Create Production Resources

```bash
# Create prod resource group and resources
az group create --name inventory-prod-rg --location eastus

# Create separate SQL Database (production tier)
# Create separate App Service Plan (B2 or P1V2)
# Create separate Container Registry (or shared)
```

### 8.2 Create Production Workflow

Create `.github/workflows/deploy-prod.yml`:

```yaml
name: Deploy to Prod

on:
  workflow_dispatch:  # Manual trigger only
  release:
    types: [published]  # Auto-trigger on GitHub releases

env:
  REGISTRY: inventorydevacr.azurecr.io
  IMAGE_NAME: inventory

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: production  # GitHub environment protection
    
    steps:
      # Same as dev, but:
      # - Use prod secrets
      # - Tag image with release version
      # - Deploy to prod app service
      # - Add approval steps
      # - Run smoke tests
```

### 8.3 Branching Strategy

```
main (dev) → push automatically deploys to dev
  ├── production (prod) → manual deploy to prod
  └── feature/* → pull requests to main
```

---

## 9. Monitoring & Logs

### 9.1 View Logs

```bash
# Stream logs from App Service
az webapp log tail \
  --resource-group inventory-dev-rg \
  --name inventory-dev-app
```

### 9.2 Check Database

```bash
# View migrations history
npx prisma migrate status

# View last migration
az sql db query \
  --resource-group inventory-dev-rg \
  --server inventory-dev-server \
  --database inventory_dev_db \
  --query-text "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC"
```

### 9.3 Application Logs

In Azure Portal:
1. Go to App Service → `inventory-dev-app`
2. Click **Log Stream**
3. Monitor real-time logs
4. Check **Diagnostic settings** for Application Insights

---

## 10. Rollback Procedure

### 10.1 Quick Rollback (if broken deployment)

```bash
# Restart app (reuses previous working image)
az webapp restart \
  --resource-group inventory-dev-rg \
  --name inventory-dev-app

# Or redeploy previous Git commit
git revert HEAD
git push origin main  # Triggers new deployment
```

### 10.2 Database Rollback (if migration fails)

```bash
# Check migration status
npx prisma migrate status

# Resolve failed migration (don't revert - SQL doesn't support it)
# Either: 1) Fix the migration and re-run
#         2) Restore from backup
#         3) Manually fix database schema
```

---

## 11. Secrets Rotation

### 11.1 Rotate Azure SQL Password

```bash
# Generate new password
az sql server update \
  --resource-group inventory-dev-rg \
  --name inventory-dev-server \
  --admin-user sqladmin \
  --admin-password NewSecurePassword123!

# Update GitHub secret
# Settings → Secrets → Update DATABASE_URL
```

### 11.2 Rotate NEXTAUTH_SECRET

```bash
# Generate new secret
openssl rand -base64 32

# Update GitHub secret
# Redeploy: git push (or manual trigger)
```

---

## 12. Cost Monitoring

### 12.1 Check Dev Costs

```bash
# View resource costs
az cost management query create \
  --scope "/subscriptions/{subscription-id}/resourceGroups/inventory-dev-rg" \
  --timeframe MonthToDate \
  --granularity Daily
```

**Expected Dev Costs:**
- Azure SQL Database (free offer): $0
- App Service B1: ~$10-15/month
- Container Registry: ~$5/month
- **Total: ~$15-20/month**

---

## 13. Checklist: First Deployment

- [ ] Azure resources created (SQL, App Service, ACR)
- [ ] GitHub repository created and private
- [ ] GitHub secrets added (database URL, API keys, etc.)
- [ ] Docker file created and tested locally
- [ ] GitHub Actions workflow created
- [ ] `.env.local` created and `.env.local` added to `.gitignore`
- [ ] Prisma schema defined and initial migration created
- [ ] Next.js application built and tested locally
- [ ] First `git push` to main triggers deployment
- [ ] Application loads and logs show migrations ran
- [ ] Database connection works in dev
- [ ] Google OAuth working in dev
- [ ] QR scanner interface loads on mobile

---

## 14. Useful Commands

```bash
# Development
npm run dev
npx prisma migrate dev --name migration_name
npx prisma studio

# Docker (local testing)
docker build -t inventory:latest .
docker run -p 3000:3000 --env-file .env.local inventory:latest

# Azure CLI
az webapp log tail --resource-group inventory-dev-rg --name inventory-dev-app
az webapp restart --resource-group inventory-dev-rg --name inventory-dev-app
az sql db query --resource-group inventory-dev-rg --server inventory-dev-server --database inventory_dev_db

# GitHub CLI
gh workflow run deploy-dev.yml
gh run view
```

---

## 15. Next Steps

1. **Set up Azure resources** (Section 1.2 - 1.6)
2. **Create GitHub repository** (Section 2)
3. **Add GitHub secrets** (Section 4)
4. **Create GitHub Actions workflow** (Section 5)
5. **Push code to main branch**
6. **Monitor deployment** (Section 7.3)
7. **Test application** in dev
8. **Plan production setup** (Section 8) for later

---

**Document Version:** 1.0.0  
**Last Updated:** May 2026
