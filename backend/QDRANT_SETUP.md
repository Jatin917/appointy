# Qdrant Vector Search Setup Guide

This guide explains how to set up and use Qdrant for vector search in your application.

## Why Qdrant Instead of pgvector?

✅ **Advantages:**
- No PostgreSQL extensions needed
- Easy to install and run with Docker
- Better performance for large-scale vector search
- Dedicated vector database with advanced features
- Works on any OS (Windows, Mac, Linux)
- No special PostgreSQL setup required

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   PostgreSQL    │         │     Qdrant      │
│   (via Prisma)  │         │  Vector Database│
├─────────────────┤         ├─────────────────┤
│ - id: 123       │◄───────►│ - id: 123       │
│ - title         │  Same   │ - embedding     │
│ - content       │   ID    │   [768 floats]  │
│ - description   │         │ - metadata      │
│ - metadata      │         │                 │
│ - labels        │         │                 │
└─────────────────┘         └─────────────────┘
  Structured Data            Vector Embeddings
```

## Quick Start (3 Steps)

### Step 1: Start Qdrant with Docker

```bash
# Start Qdrant
docker-compose up -d

# Verify it's running
docker ps
```

You should see `appointy-qdrant` running on ports 6333 and 6334.

### Step 2: Run Database Migration

```bash
# Add summary and meta_tags columns to content_items
npm run db:migrate
```

### Step 3: Start Your Server

```bash
npm run dev
```

The server will automatically:
- ✅ Connect to Qdrant
- ✅ Create the `content_embeddings` collection
- ✅ Enable semantic search endpoints

## Detailed Setup

### Prerequisites

- Docker Desktop installed
- PostgreSQL database (your existing `appointy` database)
- Node.js and npm

### 1. Start Qdrant

Using docker-compose (recommended):

```bash
cd /d/coding/appointy/backend
docker-compose up -d
```

Or using docker directly:

```bash
docker run -d \
  --name appointy-qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v qdrant_storage:/qdrant/storage \
  qdrant/qdrant:latest
```

**Verify Qdrant is running:**

```bash
curl http://localhost:6333/health
# Should return: {"title":"qdrant - vector search engine","version":"..."}
```

Or visit in browser: http://localhost:6333/dashboard

### 2. Update Environment Variables

Your `.env` should have:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/appointy
USE_PRISMA=true
QDRANT_URL=http://localhost:6333
GEMINI_API_KEY=your_actual_key
```

### 3. Run Migration

```bash
npm run db:migrate
```

This adds `summary` and `meta_tags` columns to your PostgreSQL `content_items` table.

### 4. Start Server

```bash
npm run dev
```

You should see:

```
Initializing Qdrant vector database...
✅ Qdrant initialized successfully
✓ Collection content_embeddings already exists

🚀 Server is running on port 3000
   Environment: development
   Vector Search: Enabled (Qdrant)

📚 API Endpoints:
   POST   /api/content - Create content
   GET    /api/content - List content
   GET    /api/content/:id - Get content by ID
   PUT    /api/content/:id - Update content
   DELETE /api/content/:id - Delete content
   GET    /api/content/search?q=query - Semantic search
   POST   /api/content/search - Advanced search
```

## How It Works

### Creating Content

```javascript
// POST /api/content
{
  "title": "Machine Learning Basics",
  "content": "Introduction to ML concepts...",
  "labels": ["ai", "tutorial"]
}
```

**Behind the scenes:**
1. ✅ Store in PostgreSQL → Get ID (e.g., 123)
2. ✅ Combine text: "Title: Machine Learning Basics\nContent: Introduction..."
3. ✅ Generate 768-dim embedding with Gemini
4. ✅ Store in Qdrant with same ID (123)

### Searching Content

```javascript
// GET /api/content/search?q=artificial intelligence tutorials
```

**Behind the scenes:**
1. ✅ Convert query to embedding
2. ✅ Search Qdrant for similar vectors
3. ✅ Get top 10 IDs: [123, 456, 789, ...]
4. ✅ Fetch full content from PostgreSQL
5. ✅ Return with similarity scores

## Testing the System

### 1. Create Test Content

```bash
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to Machine Learning",
    "description": "A beginner guide to ML concepts",
    "content": "Machine learning is a subset of AI that enables systems to learn from data...",
    "labels": ["machine-learning", "ai", "tutorial"]
  }'
```

### 2. Create More Content

```bash
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Chocolate Chip Cookie Recipe",
    "description": "Delicious homemade cookies",
    "content": "Mix flour, butter, sugar, eggs, and chocolate chips. Bake at 350F...",
    "labels": ["recipe", "dessert", "baking"]
  }'
```

### 3. Test Semantic Search

```bash
# Search for AI content
curl "http://localhost:3000/api/content/search?q=artificial%20intelligence%20tutorials"

# Should return the ML article with high similarity score

# Search for cooking content
curl "http://localhost:3000/api/content/search?q=how%20to%20bake%20sweet%20treats"

# Should return the cookie recipe
```

## Qdrant Dashboard

Access the web UI at: http://localhost:6333/dashboard

Here you can:
- View collections
- See vector count
- Monitor performance
- Browse stored vectors

## Managing Qdrant

### View Collections

```bash
curl http://localhost:6333/collections
```

### View Collection Info

```bash
curl http://localhost:6333/collections/content_embeddings
```

### Stop Qdrant

```bash
docker-compose down
```

### Restart Qdrant

```bash
docker-compose up -d
```

### View Logs

```bash
docker logs appointy-qdrant
```

### Backup Data

Qdrant data is stored in a Docker volume. To backup:

```bash
docker run --rm -v qdrant_storage:/data -v $(pwd):/backup ubuntu tar czf /backup/qdrant-backup.tar.gz /data
```

### Restore Data

```bash
docker run --rm -v qdrant_storage:/data -v $(pwd):/backup ubuntu tar xzf /backup/qdrant-backup.tar.gz -C /
```

## Troubleshooting

### "Qdrant is not accessible"

**Problem:** Server shows warning about Qdrant not being accessible.

**Solution:**
```bash
# Check if Qdrant is running
docker ps | grep qdrant

# If not running, start it
docker-compose up -d

# Restart your Node server
npm run dev
```

### "Port 6333 is already in use"

**Problem:** Another service is using port 6333.

**Solution:**
Edit `docker-compose.yml`:
```yaml
ports:
  - "6444:6333"  # Use different port
```

Update `.env`:
```env
QDRANT_URL=http://localhost:6444
```

### "Collection already exists" error

**Problem:** Collection was created with wrong settings.

**Solution:**
```bash
# Delete the collection
curl -X DELETE http://localhost:6333/collections/content_embeddings

# Restart server to recreate
npm run dev
```

### Search returns no results

**Possible causes:**
1. **Threshold too high:** Lower the threshold
   ```bash
   curl "http://localhost:3000/api/content/search?q=query&threshold=0.3"
   ```

2. **No embeddings generated:** Check if content was created with `USE_PRISMA=true`

3. **Qdrant not running:** Start Qdrant with `docker-compose up -d`

## Performance Tips

### 1. Batch Inserts

When adding many items, embeddings are generated one by one. For better performance, consider batching Gemini API calls.

### 2. Adjust Search Limits

```javascript
// Get more results
GET /api/content/search?q=query&limit=20

// Get fewer, more relevant results
GET /api/content/search?q=query&limit=5&threshold=0.7
```

### 3. Use Filters

```javascript
POST /api/content/search
{
  "query": "machine learning",
  "filters": {
    "type": "article",
    "labels": ["tutorial"]
  }
}
```

## Cost Considerations

### Qdrant
- ✅ **Free** when self-hosted with Docker
- Optional: Qdrant Cloud for managed hosting (paid)

### Google Gemini API
- Text embedding: ~$0.00025 per 1000 characters
- For 1000 content items (~500 chars each): ~$0.125

### Storage
- PostgreSQL: Standard text storage
- Qdrant: ~3KB per embedding (768 floats × 4 bytes)
- For 100k items: ~300MB vector storage

## Migration from Legacy Service

If you have existing content created with the legacy service:

1. Set `USE_PRISMA=true`
2. Start Qdrant
3. Fetch existing content and re-create to generate embeddings:

```bash
# Get all content
curl http://localhost:3000/api/content > existing_content.json

# Re-create each item (this will generate embeddings)
# Parse JSON and POST each item back
```

## Next Steps

- ✅ System is ready to use
- ✅ Create content → Auto-generates embeddings
- ✅ Search semantically → Fast vector search
- ✅ Scale as needed → Qdrant handles millions of vectors

For production deployment:
- Use Qdrant Cloud for managed hosting
- Implement embedding caching
- Add rate limiting for search
- Monitor Gemini API usage

## Support

- Qdrant Docs: https://qdrant.tech/documentation/
- Qdrant Discord: https://discord.gg/qdrant
- GitHub Issues: Report bugs in your repo
