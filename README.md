# QR Code Inventory Tracking & Handoff System

A real-time inventory tracking application for managing equipment boxes through their complete lifecycle with QR code scanning, role-based permissions, and live synchronization across multiple users.

## Features

- **QR Code Scanning** — Scan equipment boxes through check-in, activation, return, and check-out workflows
- **Real-time Synchronization** — WebSocket-based live updates across all connected users in a project
- **Role-Based Access Control** — Admin, Inventory Manager, Installation, and Read-Only roles with project-scoped permissions
- **State Machine Validation** — Enforces proper box state transitions (Received → In Use → Ready for Checkout → Departed)
- **Audit Trail** — Complete history of all box state changes with timestamps, user info, and notes
- **Admin Dashboard** — Create projects, assign users to projects, manage roles
- **Live Dashboard** — Color-coded box states, filtering, and detailed history viewing
- **Race Condition Handling** — Database transactions prevent concurrent scan conflicts

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, TailwindCSS |
| **Backend** | Next.js API Routes, TypeScript |
| **Database** | Azure SQL Database with Prisma ORM |
| **Authentication** | Google OAuth 2.0 via NextAuth.js |
| **Real-time** | Socket.io for WebSocket communication |
| **QR Scanning** | html5-qrcode library |
| **Testing** | Jest |
| **Deployment** | Azure (App Service, SQL Database, Container Registry) |
| **CI/CD** | GitHub Actions |

## Project Structure

```
.
├── src/
│   ├── pages/
│   │   ├── index.tsx                 # Home/login page
│   │   ├── dashboard.tsx             # Main dashboard
│   │   ├── scanner.tsx               # QR scanner interface
│   │   ├── admin/
│   │   │   ├── index.tsx             # Admin dashboard
│   │   │   └── projects/[id].tsx     # Project management
│   │   └── api/
│   │       ├── auth/                 # NextAuth handlers
│   │       ├── projects/             # Project endpoints
│   │       ├── boxes/                # Box & scan endpoints
│   │       └── socket.ts             # Socket.io initialization
│   ├── components/
│   │   ├── QRScanner.tsx             # QR scanner component
│   │   ├── Dashboard.tsx             # Dashboard component
│   │   └── RealtimeSync.tsx          # Real-time sync listener
│   ├── lib/
│   │   ├── auth.ts                   # NextAuth configuration
│   │   ├── auth-middleware.ts        # Role-based middleware
│   │   ├── db.ts                     # Prisma client
│   │   ├── state-machine.ts          # Box state validation
│   │   ├── socket.ts                 # Socket.io server
│   │   ├── broadcast.ts              # Event broadcasting
│   │   └── use-socket.ts             # Socket.io React hooks
│   ├── types/
│   │   └── index.ts                  # TypeScript interfaces
│   └── middleware/
│       └── auth.ts                   # Authentication middleware
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── migrations/                   # Prisma migrations
├── __tests__/                        # Jest test files
├── .github/workflows/
│   └── deploy-dev.yml                # GitHub Actions CI/CD
├── Dockerfile                        # Container image
├── docker-compose.yml                # Local Docker setup
├── .env.example                      # Environment variable template
├── next.config.js                    # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Dependencies and scripts
```

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- Google OAuth credentials (for authentication)
- Azure SQL Database or local SQL Server (optional for local dev)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/qr-code-inventory.git
cd qr-code-inventory
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Database Connection
DATABASE_URL="sqlserver://YOUR_SERVER:1433;database=YOUR_DATABASE;user=YOUR_USER;password=YOUR_PASSWORD;encrypt=true;trustServerCertificate=false;Connection Timeout=30;"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Google OAuth Credentials
# Get these from https://console.cloud.google.com/
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

# Socket.io (Optional for development)
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

### Environment Variable Details

**DATABASE_URL**
- For Azure SQL: Connection string from Azure Portal → SQL Databases → Connection Strings → ADO.NET
- Format: `sqlserver://server:port;database=name;user=user;password=pass;encrypt=true;`
- For local SQL Server: `sqlserver://localhost;database=inventory;user=sa;password=YourPassword;encrypt=true;trustServerCertificate=true;`

**NEXTAUTH_SECRET**
- Generate a secure random string: `openssl rand -base64 32`
- Used for encrypting authentication tokens
- **MUST be different for production**

**GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials (type: Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Copy Client ID and Client Secret to `.env.local`

### 4. Set Up Database

```bash
# Run Prisma migrations
npx prisma migrate deploy

# (Optional) Open Prisma Studio to view/edit database
npx prisma studio
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser. You should see the login page.

### 6. Test the Application

```bash
# Run full test suite
npm test

# Run tests in watch mode
npm test -- --watch

# Build for production
npm run build
```

## Deployment to Azure

### Prerequisites

- Azure subscription
- Azure CLI installed (`az --version`)
- Docker Desktop installed
- GitHub repository with CI/CD pipeline

### Step 1: Create Azure Resources

#### 1.1 Create Resource Group

```bash
az group create \
  --name inventory-rg \
  --location eastus
```

#### 1.2 Create Azure SQL Database

```bash
# Create SQL Server
az sql server create \
  --name inventory-sqlserver \
  --resource-group inventory-rg \
  --location eastus \
  --admin-user sqladmin \
  --admin-password 'YourSecurePassword123!'

# Allow Azure services to access
az sql server firewall-rule create \
  --server inventory-sqlserver \
  --resource-group inventory-rg \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Create database
az sql db create \
  --server inventory-sqlserver \
  --resource-group inventory-rg \
  --name inventory_db \
  --sku Standard \
  --tier S0
```

#### 1.3 Create Container Registry

```bash
az acr create \
  --resource-group inventory-rg \
  --name inventoryregistry \
  --sku Basic
```

#### 1.4 Create App Service Plan

```bash
az appservice plan create \
  --name inventory-plan \
  --resource-group inventory-rg \
  --sku B2 \
  --is-linux
```

#### 1.5 Create Web App

```bash
az webapp create \
  --resource-group inventory-rg \
  --plan inventory-plan \
  --name inventory-app \
  --deployment-container-image-name-placeholder placeholder
```

### Step 2: Configure Environment Variables

In Azure Portal or via Azure CLI, set app settings:

```bash
az webapp config appsettings set \
  --resource-group inventory-rg \
  --name inventory-app \
  --settings \
  DATABASE_URL="sqlserver://inventory-sqlserver.database.windows.net:1433;database=inventory_db;user=sqladmin;password=YourSecurePassword123!;encrypt=true;trustServerCertificate=false;Connection Timeout=30;" \
  NEXTAUTH_URL="https://inventory-app.azurewebsites.net" \
  NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  GOOGLE_CLIENT_ID="YOUR_PRODUCTION_CLIENT_ID" \
  GOOGLE_CLIENT_SECRET="YOUR_PRODUCTION_CLIENT_SECRET" \
  NEXT_PUBLIC_SOCKET_URL="https://inventory-app.azurewebsites.net" \
  NODE_ENV="production"
```

### Step 3: Configure Docker & Container Registry

#### 3.1 Build Docker Image

```bash
docker build -t inventoryregistry.azurecr.io/inventory:latest .
```

#### 3.2 Log in to Container Registry

```bash
az acr login --name inventoryregistry
```

#### 3.3 Push Image to Registry

```bash
docker push inventoryregistry.azurecr.io/inventory:latest
```

### Step 4: Configure Web App for Container Registry

```bash
# Enable managed identity
az webapp identity assign \
  --resource-group inventory-rg \
  --name inventory-app

# Grant registry pull permissions
az role assignment create \
  --assignee-object-id $(az webapp identity show -g inventory-rg -n inventory-app --query principalId -o tsv) \
  --role AcrPull \
  --scope $(az acr show -n inventoryregistry --query id -o tsv)

# Configure container settings
az webapp config container set \
  --resource-group inventory-rg \
  --name inventory-app \
  --docker-custom-image-name inventoryregistry.azurecr.io/inventory:latest \
  --docker-registry-server-url https://inventoryregistry.azurecr.io
```

### Step 5: Set Up CI/CD Pipeline (GitHub Actions)

The project includes a GitHub Actions workflow (`.github/workflows/deploy-dev.yml`) that:

1. Runs tests on every push
2. Builds Docker image
3. Pushes to Azure Container Registry
4. Deploys to App Service

#### 5.1 Create GitHub Secrets

In GitHub repository settings → Secrets and variables → Actions, add:

| Secret | Value |
|--------|-------|
| `AZURE_REGISTRY_LOGIN_SERVER` | `inventoryregistry.azurecr.io` |
| `AZURE_REGISTRY_USERNAME` | Azure Container Registry username |
| `AZURE_REGISTRY_PASSWORD` | Azure Container Registry password |
| `AZURE_RESOURCE_GROUP` | `inventory-rg` |
| `AZURE_WEBAPP_NAME` | `inventory-app` |

#### 5.2 View Deployment Status

Push to main branch and monitor GitHub Actions workflow under the "Actions" tab.

### Step 6: Database Migrations on Deploy

The `Dockerfile` includes:

```dockerfile
RUN npx prisma migrate deploy
```

This automatically runs pending migrations when the container starts in production.

### Step 7: Monitor Deployment

```bash
# View logs
az webapp log tail --resource-group inventory-rg --name inventory-app

# Check app status
az webapp show \
  --resource-group inventory-rg \
  --name inventory-app \
  --query "state"
```

### Step 8: Set Up Custom Domain (Optional)

```bash
# Add custom domain
az webapp config hostname add \
  --resource-group inventory-rg \
  --webapp-name inventory-app \
  --hostname yourdomain.com

# Create SSL binding (requires certificate)
az webapp config ssl bind \
  --resource-group inventory-rg \
  --name inventory-app \
  --certificate-thumbprint YOUR_CERT_THUMBPRINT
```

## Common Deployment Issues

### Issue: "Database connection failed"
- **Cause**: Firewall rules or incorrect connection string
- **Solution**: 
  - Check Azure SQL firewall allows App Service IP
  - Verify DATABASE_URL format in app settings
  - Test connection locally first

### Issue: "Container fails to start"
- **Cause**: Missing environment variables or failed migrations
- **Solution**:
  - Check app settings in Azure Portal
  - View Container logs: `az webapp log tail --name inventory-app --resource-group inventory-rg`
  - Ensure all required env vars are set

### Issue: "Google OAuth fails"
- **Cause**: Incorrect redirect URI or credentials
- **Solution**:
  - Verify redirect URI in Google Cloud Console matches production URL
  - Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
  - Ensure NEXTAUTH_URL is set to production domain

## Development Commands

```bash
# Development
npm run dev                    # Start dev server on http://localhost:3000

# Building
npm run build                  # Build for production
npm run start                  # Start production server

# Testing
npm test                       # Run test suite
npm test -- --watch          # Run tests in watch mode

# Database
npx prisma migrate dev --name <name>  # Create and apply migration
npx prisma studio                     # Open visual database editor
npx prisma validate                   # Validate schema.prisma

# Linting
npm run lint                   # Run ESLint
npm run lint -- --fix         # Fix ESLint issues

# Docker
docker build -t inventory:latest .     # Build Docker image
docker run -p 3000:3000 --env-file .env.local inventory:latest  # Run locally
```

## Testing

The project includes Jest tests for:
- State machine transitions and permissions
- API endpoint authentication and authorization
- Project management workflows

```bash
npm test                      # Run all tests
npm test -- --coverage       # Run with coverage report
npm test -- state-machine    # Run specific test file
```

## Architecture Overview

### State Machine

Boxes follow a strict state transition flow:

```
RECEIVED ──→ IN_USE ──→ READY_FOR_CHECKOUT ──→ DEPARTED
   ↑                                               │
   └───────────────────────────────────────────────┘
              (manual override by admin)
```

### Real-time Synchronization

1. Client scans QR code → POST `/api/boxes/scan`
2. Backend processes scan, updates database, broadcasts event
3. Socket.io emits `box_state_changed` to all users in project
4. All connected dashboards update in real-time
5. No page refresh needed

### Role-Based Access Control

| Role | Check-in | Activate | Return | Check-out | Create Project | Manage Users |
|------|----------|----------|--------|-----------|-----------------|---|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Inventory Manager | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Installation | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Read-Only | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

## Documentation

- **Technical Specification**: See `inventory_system_spec.md` for complete system design
- **Deployment Guide**: See `deployment_cicd_guide.md` for detailed Azure setup
- **Implementation Plans**: See `docs/superpowers/plans/` for development roadmap

## Support & Troubleshooting

### Check Application Status

```bash
# Local dev
npm run dev                 # Starts on http://localhost:3000

# Production (Azure)
az webapp show --resource-group inventory-rg --name inventory-app
```

### View Logs

```bash
# Local
npm run dev              # Logs appear in terminal

# Production
az webapp log tail --resource-group inventory-rg --name inventory-app
```

### Database Issues

```bash
# Local: Validate schema
npx prisma validate

# Local: Reset database (CAUTION)
npx prisma migrate reset

# Production: Check connection
az sql db show --resource-group inventory-rg --server inventory-sqlserver -n inventory_db
```

## Contributing

1. Create a feature branch from `main`
2. Implement changes following the project structure
3. Write tests for new functionality
4. Commit with clear messages
5. Push and create a Pull Request

## License

[Add your license here]

## Contributors

- Implementation: Claude Code (Superpowers Framework)
- Original Design: Arto Salminen

---

**Last Updated**: May 2026  
**Version**: 1.0.0
