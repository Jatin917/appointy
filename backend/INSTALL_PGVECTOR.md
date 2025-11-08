# Installing pgvector for Windows PostgreSQL

To enable vector search functionality, you need to install the pgvector extension in your PostgreSQL database.

## Option 1: Use Docker (Easiest)

This is the easiest way to get PostgreSQL with pgvector on Windows:

### 1. Install Docker Desktop
Download and install Docker Desktop from: https://www.docker.com/products/docker-desktop

### 2. Run PostgreSQL with pgvector

```bash
# Stop your current PostgreSQL if it's running on port 5432

# Run PostgreSQL 16 with pgvector
docker run -d \
  --name postgres-vector \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=appointy \
  -e POSTGRES_USER=postgres \
  -p 5432:5432 \
  -v pgvector-data:/var/lib/postgresql/data \
  pgvector/pgvector:pg16

# Check if it's running
docker ps
```

### 3. Import your existing data (if needed)

```bash
# Export from your old database
pg_dump -U postgres -d appointy > appointy_backup.sql

# Import to Docker database
docker exec -i postgres-vector psql -U postgres -d appointy < appointy_backup.sql
```

### 4. Update your .env

Your current .env should work:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/appointy"
USE_PRISMA=true
```

### 5. Run the migration

```bash
npm run db:migrate
```

## Option 2: Install pgvector Binary (For existing PostgreSQL)

### For PostgreSQL 16 on Windows:

1. **Download pgvector:**
   - Go to: https://github.com/pgvector/pgvector/releases
   - Download `pgvector-v0.x.x-pg16-windows-x64.zip`

2. **Extract and copy files:**
   ```
   Extract the zip file

   Copy vector.dll to:
   C:\Program Files\PostgreSQL\16\lib\

   Copy vector.control and vector--*.sql to:
   C:\Program Files\PostgreSQL\16\share\extension\
   ```

3. **Restart PostgreSQL:**
   - Open Windows Services
   - Find "postgresql-x64-16"
   - Right-click → Restart

4. **Enable extension:**
   ```sql
   -- Connect to your database
   psql -U postgres -d appointy

   -- Enable vector extension
   CREATE EXTENSION vector;

   -- Verify
   \dx
   ```

5. **Run migration:**
   ```bash
   npm run db:migrate
   ```

## Option 3: Compile from Source (Advanced)

If you have Visual Studio and PostgreSQL development headers:

```bash
# Clone repository
git clone https://github.com/pgvector/pgvector.git
cd pgvector

# Build (requires Visual Studio with C++ tools)
# Follow instructions in README for Windows compilation
```

## Verify Installation

After installing pgvector, connect to your database and run:

```sql
-- Connect to database
psql -U postgres -d appointy

-- Create extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Test it
CREATE TABLE test_vectors (id serial PRIMARY KEY, embedding vector(3));
INSERT INTO test_vectors (embedding) VALUES ('[1,2,3]');
SELECT * FROM test_vectors;
DROP TABLE test_vectors;
```

If this works, you're ready to use vector search!

## Enable Vector Search in Your App

1. Make sure pgvector is installed and working
2. Update `.env`:
   ```env
   USE_PRISMA=true
   ```
3. Run migration:
   ```bash
   npm run db:migrate
   ```
4. Start your server:
   ```bash
   npm run dev
   ```

## Troubleshooting

### "extension "vector" is not available"
- pgvector extension files are not in PostgreSQL directories
- Try Option 1 (Docker) for easiest setup

### "Could not open extension control file"
- Extension files copied to wrong location
- Check your PostgreSQL version matches the pgvector binary version

### "vector.dll is not a valid Win32 application"
- Download the correct binary for your system (x64 vs x86)
- Make sure PostgreSQL and pgvector binary versions match

### Docker: "port is already allocated"
- Your existing PostgreSQL is using port 5432
- Either stop it, or use different port: `-p 5433:5432`
- Update DATABASE_URL to use the new port

## Current Status

Until you install pgvector, the app will work with:
- `USE_PRISMA=false` → Uses legacy service (no vector search)
- All CRUD operations work
- No semantic search (GET/POST /api/content/search won't work)

After installing pgvector:
- `USE_PRISMA=true` → Full functionality
- Automatic embedding generation
- Semantic search enabled
