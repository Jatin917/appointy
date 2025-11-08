# Vector Search with Embeddings - Setup Guide

This guide explains how to set up and use the vector search system with PostgreSQL (via Prisma) and pgvector for semantic search.

## Architecture Overview

The system implements a hybrid approach:

1. **PostgreSQL (via Prisma)**: Stores all structured data (title, content, description, tags, metadata, etc.)
2. **pgvector Extension**: Stores embeddings (vector representations) in a separate table
3. **Google Gemini**: Generates 768-dimensional embeddings for semantic search

### Data Flow

#### Storing Content
```
1. User creates content → 2. Store in PostgreSQL (get ID) →
3. Combine text fields → 4. Generate embedding →
5. Store embedding with same ID in vector table
```

#### Searching Content
```
1. User submits query → 2. Convert query to embedding →
3. Search vector DB for similar embeddings → 4. Get top 10 matching IDs →
5. Fetch full content from PostgreSQL → 6. Return detailed results
```

## Prerequisites

1. PostgreSQL database (v12 or higher)
2. Node.js (v16 or higher)
3. Google Gemini API key

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

Update `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/appointy
USE_PRISMA=true
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Enable pgvector Extension in PostgreSQL

Connect to your PostgreSQL database and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Run Database Migration

The migration file is located at: `prisma/migrations/20250111_add_vector_embeddings/migration.sql`

Run it manually:

```bash
psql -U postgres -d appointy -f prisma/migrations/20250111_add_vector_embeddings/migration.sql
```

Or run Prisma migrate:

```bash
npx prisma migrate deploy
```

### 5. Generate Prisma Client

```bash
npx prisma generate
```

## Database Schema

### content_items Table
Stores all structured content data:
- `id`: Primary key
- `type`: Content type (article, note, image, etc.)
- `title`: Content title
- `description`: Content description
- `content`: Main content text
- `url`: Optional URL
- `image_url`: Optional image URL
- `metadata`: JSONB field for flexible metadata
- `labels`: Array of tags/labels
- `summary`: Content summary
- `meta_tags`: Additional metadata
- `created_at`, `updated_at`: Timestamps

### content_embeddings Table
Stores vector embeddings:
- `id`: Primary key
- `content_id`: Foreign key to content_items (unique, cascade delete)
- `embedding`: 768-dimensional vector (Google Gemini text-embedding-004)
- `combined_text`: The text used to generate the embedding
- `created_at`, `updated_at`: Timestamps

## API Endpoints

### 1. Create Content with Embedding

**POST** `/api/content`

Creates content in PostgreSQL, generates embedding, and stores in vector DB.

```json
{
  "title": "My Article",
  "description": "An article about AI",
  "content": "Full article content here...",
  "metadata": {
    "tags": ["AI", "Machine Learning"],
    "category": "Technology"
  },
  "labels": ["tech", "ai"]
}
```

Response includes the created content with ID.

### 2. Semantic Search

**GET** `/api/content/search?q=your search query&limit=10&threshold=0.5`

or

**POST** `/api/content/search`

```json
{
  "query": "articles about artificial intelligence",
  "limit": 10,
  "threshold": 0.5,
  "filters": {
    "type": "article",
    "labels": ["tech"]
  }
}
```

**Parameters:**
- `query`: Search query text (required)
- `limit`: Maximum number of results (default: 10)
- `threshold`: Minimum similarity score 0-1 (default: 0.5)
- `filters`: Optional filters
  - `type`: Filter by content type
  - `labels`: Filter by labels array

**Response:**
```json
{
  "success": true,
  "query": "articles about AI",
  "count": 5,
  "data": [
    {
      "id": 1,
      "type": "article",
      "title": "Introduction to AI",
      "description": "...",
      "content": "...",
      "labels": ["ai", "tech"],
      "metadata": {...},
      "similarity": 0.92,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### 3. Other Endpoints

- **GET** `/api/content` - List all content with filters
- **GET** `/api/content/:id` - Get specific content by ID
- **PUT** `/api/content/:id` - Update content (auto-updates embedding)
- **DELETE** `/api/content/:id` - Delete content (cascade deletes embedding)
- **POST** `/api/content/upload-image` - Upload image with analysis

## How Embeddings Work

### Text Combination for Embedding

The system combines multiple fields into a single text for embedding:

```
Title: [title]

Summary: [summary]

Description: [description]

Tags: [tag1, tag2, tag3]

Content: [first 2000 chars of content]
```

### Embedding Generation

- Model: Google Gemini `text-embedding-004`
- Dimension: 768
- Task Type for Documents: `RETRIEVAL_DOCUMENT`
- Task Type for Queries: `RETRIEVAL_QUERY`

### Similarity Search

Uses **cosine similarity** to find similar vectors:
- Score range: 0 to 1
- 1 = identical vectors
- 0 = completely different
- Typical threshold: 0.5 (configurable)

## Usage Examples

### Example 1: Store and Search Articles

```bash
# 1. Create an article
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Understanding Neural Networks",
    "description": "A comprehensive guide to neural networks",
    "content": "Neural networks are...",
    "labels": ["ai", "deep-learning", "tutorial"]
  }'

# 2. Search for similar content
curl "http://localhost:3000/api/content/search?q=deep%20learning%20tutorial&limit=5"
```

### Example 2: Filter Search Results

```bash
curl -X POST http://localhost:3000/api/content/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning algorithms",
    "limit": 10,
    "threshold": 0.6,
    "filters": {
      "type": "article",
      "labels": ["ai"]
    }
  }'
```

## Performance Optimization

### Vector Index

The migration creates an IVFFlat index for faster similarity search:

```sql
CREATE INDEX idx_content_embeddings_vector ON content_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Tuning `lists` parameter:**
- Small dataset (<10k): lists = 100
- Medium dataset (10k-100k): lists = sqrt(total_rows)
- Large dataset (>100k): lists = total_rows / 1000

### Rebuild Index After Bulk Inserts

```sql
REINDEX INDEX idx_content_embeddings_vector;
```

## Troubleshooting

### Error: "pgvector extension not found"

```bash
# Install pgvector extension
sudo apt-get install postgresql-14-pgvector  # Ubuntu/Debian

# Or build from source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

Then in PostgreSQL:
```sql
CREATE EXTENSION vector;
```

### Error: "Failed to generate embedding"

- Check GEMINI_API_KEY is valid
- Ensure you have internet connection
- Check API quota limits

### Slow Search Performance

- Ensure vector index exists: `\d content_embeddings` in psql
- Tune `lists` parameter in index
- Consider increasing `threshold` to reduce results
- Add filters to narrow search scope

## Migration from Legacy Service

If you're migrating from the old pg-based service:

1. Set `USE_PRISMA=true` in `.env`
2. Run the migration to add new columns and embeddings table
3. Create a script to generate embeddings for existing content:

```typescript
// scripts/migrate-embeddings.ts
import prisma from './src/lib/prisma';
import embeddingService from './src/services/embedding.service';
import pool from './src/db/connection';

async function migrateEmbeddings() {
  const contents = await prisma.contentItem.findMany();

  for (const content of contents) {
    const combinedText = embeddingService.combineContentForEmbedding(
      content.title || undefined,
      content.description || undefined,
      content.content || undefined,
      content.labels
    );

    const embedding = await embeddingService.generateEmbedding(combinedText);
    const vectorString = `[${embedding.join(',')}]`;

    await pool.query(
      `INSERT INTO content_embeddings (content_id, embedding, combined_text)
       VALUES ($1, $2::vector, $3)`,
      [content.id, vectorString, combinedText]
    );

    console.log(`Migrated embedding for content ID: ${content.id}`);
  }
}

migrateEmbeddings();
```

## Best Practices

1. **Keep combined_text field**: Always store the text used for embedding to enable re-generation
2. **Update embeddings on content changes**: The service auto-updates embeddings when content changes
3. **Use appropriate thresholds**: Start with 0.5 and adjust based on results quality
4. **Monitor API usage**: Google Gemini has rate limits
5. **Batch operations**: For bulk inserts, consider batching embedding generation
6. **Regular maintenance**: Run `VACUUM ANALYZE` on tables periodically

## Next Steps

- Implement caching for frequently searched queries
- Add hybrid search (combine vector + keyword search)
- Implement search analytics
- Add multi-language support
- Consider using different embedding models for different content types

## Support

For issues or questions:
- Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-14-main.log`
- Check application logs
- Verify database connection and pgvector installation
- Test embedding generation independently
