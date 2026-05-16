# Environment Configuration Guide

## Converting JDBC to Prisma Connection String

If you have a JDBC connection string (from SQL Server management tools), here's how to convert it to the format needed for this Node.js/Prisma application.

### Your JDBC Connection String

```
jdbc:sqlserver://inventory-management-db-rc.database.windows.net:1433;database=inventory-management-db-dev;user={my_username_here}@inventory-management-db-rc;password={my_password_here};encrypt=true;trustServerCertificate=false;hostNameInCertificate=*.database.windows.net;loginTimeout=30;
```

### Step 1: Extract Connection Parameters

From your JDBC string, extract these values:

| Parameter | Value from JDBC |
|-----------|-----------------|
| **Server** | `inventory-management-db-rc.database.windows.net` |
| **Port** | `1433` (default) |
| **Database** | `inventory-management-db-dev` |
| **Username** | `{my_username_here}@inventory-management-db-rc` |
| **Password** | `{my_password_here}` |
| **Encryption** | `true` |
| **Trust Server Certificate** | `false` |

### Step 2: Convert to Prisma Format

Prisma uses the `sqlserver://` protocol with this format:

```
sqlserver://[username]:[password]@[server]:[port];database=[database];[options]
```

**Your converted connection string:**

```
sqlserver://my_username@inventory-management-db-rc:my_password@inventory-management-db-rc.database.windows.net:1433;database=inventory-management-db-dev;encrypt=true;trustServerCertificate=false;connectionTimeout=30;
```

### Step 3: Create `.env.local` File

In the root directory of the project, create a `.env.local` file (DO NOT commit this to git):

```bash
# Database
DATABASE_URL="sqlserver://my_username@inventory-management-db-rc:my_password@inventory-management-db-rc.database.windows.net:1433;database=inventory-management-db-dev;encrypt=true;trustServerCertificate=false;connectionTimeout=30;"

# NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Connection String Breakdown

### JDBC → Prisma Mapping

| JDBC Parameter | Prisma Format | Notes |
|---|---|---|
| `jdbc:sqlserver://` | `sqlserver://` | Protocol changes |
| `user={name}@{server}` | `username@server` | Username stays same, appears before `@` in URL |
| `password=xxx` | `:password` | Comes after username, before second `@` |
| `{server}.database.windows.net` | `@{server}.database.windows.net` | Full server name after second `@` |
| `:1433` | `:1433` | Port stays same |
| `database=name` | `;database=name` | Becomes query parameter |
| `encrypt=true` | `;encrypt=true` | Becomes query parameter |
| `trustServerCertificate=false` | `;trustServerCertificate=false` | Becomes query parameter |
| `loginTimeout=30` | `;connectionTimeout=30` | Note: parameter name changes |
| `hostNameInCertificate` | (not required) | Usually omitted in Prisma |

### Full Connection String Formula

```
sqlserver://{username}@{server}:{password}@{server}.database.windows.net:{port};database={database};encrypt=true;trustServerCertificate=false;connectionTimeout=30;
```

**With your values:**

```
sqlserver://my_username@inventory-management-db-rc:my_password@inventory-management-db-rc.database.windows.net:1433;database=inventory-management-db-dev;encrypt=true;trustServerCertificate=false;connectionTimeout=30;
```

## Common Azure SQL Connection Scenarios

### Scenario 1: Azure SQL with Azure AD Authentication

If using Azure AD (Entra ID) instead of SQL Server authentication:

```
sqlserver://user@domain.onmicrosoft.com:password@servername.database.windows.net:1433;database=dbname;encrypt=true;trustServerCertificate=false;authentication=ActiveDirectoryPassword;
```

### Scenario 2: Local SQL Server (Development)

For SQL Server running locally:

```
sqlserver://sa:YourPassword123@localhost:1433;database=inventory_db;encrypt=true;trustServerCertificate=true;
```

**Note:** Use `trustServerCertificate=true` only for local development.

### Scenario 3: SQL Server with Windows Authentication

Windows auth only works locally or on domain machines:

```
sqlserver://localhost;database=inventory_db;integratedSecurity=true;
```

## Testing Your Connection

After setting up `.env.local`, test the connection:

### 1. Validate with Prisma

```bash
npx prisma db push
```

This will:
- Validate the connection string
- Create/update database schema
- Show any connection errors

### 2. Run Migrations

```bash
npx prisma migrate deploy
```

This applies any pending migrations.

### 3. Open Prisma Studio

```bash
npx prisma studio
```

Opens a web UI to browse your database. If this loads successfully, your connection is working!

### 4. Run Tests

```bash
npm test
```

Tests will fail if database connection is broken.

## Troubleshooting Connection Issues

### Error: "Connection timeout"

**Causes:**
- Firewall blocking connection
- Server name is incorrect
- Port 1433 not accessible
- Connection string format error

**Solutions:**
1. Check Azure SQL Server firewall rules allow your IP
2. Verify server name in Azure Portal
3. Test connection from command line: `sqlcmd -S {server}.database.windows.net -U {username} -P {password}`

### Error: "Login failed for user"

**Causes:**
- Incorrect username or password
- Username format wrong (Azure SQL requires `user@server` format)

**Solutions:**
1. Double-check credentials in Azure Portal
2. Ensure username includes server name: `user@servername`
3. Try resetting password in Azure Portal

### Error: "Cannot find database 'xxx'"

**Causes:**
- Database name misspelled
- Database doesn't exist yet
- Wrong Azure subscription

**Solutions:**
1. Check database name in Azure Portal
2. Verify you're in correct resource group
3. Create database if it doesn't exist

### Error: "Certificate verification failed"

**Causes:**
- `trustServerCertificate=false` with invalid cert
- Self-signed certificate issues

**Solutions:**
1. Try `trustServerCertificate=true` for testing (local only)
2. Add system certificate if using custom CA
3. For Azure SQL, always use `trustServerCertificate=false` in production

## Security Best Practices

### ⚠️ DO NOT

- Commit `.env.local` to git (add to `.gitignore`)
- Share connection strings in Slack, email, or code reviews
- Use weak passwords (Azure enforces complexity)
- Hardcode credentials in application code
- Use `trustServerCertificate=true` in production

### ✅ DO

- Store passwords in environment variables only
- Use Azure Key Vault for production secrets
- Rotate passwords regularly
- Use managed identities for Azure resources
- Enable Azure SQL auditing and threat detection
- Keep `.env.local` on local machine only

## Environment Variables for Deployment

When deploying to Azure, set these in Azure Portal or Azure CLI:

```bash
az webapp config appsettings set \
  --resource-group your-rg \
  --name your-app \
  --settings \
  DATABASE_URL="sqlserver://username@server:password@server.database.windows.net:1433;database=dbname;encrypt=true;trustServerCertificate=false;connectionTimeout=30;" \
  NEXTAUTH_URL="https://your-domain.com" \
  NEXTAUTH_SECRET="your-secret" \
  GOOGLE_CLIENT_ID="your-id" \
  GOOGLE_CLIENT_SECRET="your-secret"
```

## Additional Resources

- [Prisma SQL Server Documentation](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#sqlserver)
- [Azure SQL Connection Strings](https://docs.microsoft.com/en-us/azure/azure-sql/database/connect-query-content-reference-guide)
- [SQL Server Connection String Syntax](https://www.connectionstrings.com/sql-server/)

---

**Quick Reference for Your Setup:**

```bash
# Your connection string
DATABASE_URL="sqlserver://my_username@inventory-management-db-rc:my_password@inventory-management-db-rc.database.windows.net:1433;database=inventory-management-db-dev;encrypt=true;trustServerCertificate=false;connectionTimeout=30;"

# Test it with
npx prisma studio
```
