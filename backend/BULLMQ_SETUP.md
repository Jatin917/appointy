# BullMQ Setup and Usage Guide

## Overview

This project now uses **BullMQ** with **Redis** to handle asynchronous background processing for content embeddings. This significantly improves the performance of the `/api/content` POST endpoint by moving the expensive embedding generation and vector storage operations to background workers.

## Architecture

### Before (Synchronous)
```
POST /api/content
    ↓
1. Analyze content with Gemini
2. Save to PostgreSQL
3. Generate embeddings (SLOW - Gemini API call)
4. Store in Qdrant VectorDB
    ↓
Response (SLOW - ~2-5 seconds)
```

### After (Asynchronous with BullMQ)
```
POST /api/content
    ↓
1. Analyze content with Gemini
2. Save to PostgreSQL
3. Enqueue job to Redis via BullMQ
    ↓
Response (FAST - ~200-500ms)

Background Worker (runs independently):
    ↓
1. Get job from Redis queue
2. Fetch data from PostgreSQL by ID
3. Generate embeddings (Gemini API call)
4. Store in Qdrant VectorDB
```

## Components

### 1. Redis Connection (`src/lib/redis.ts`)
- Establishes connection to Redis server
- Used by BullMQ for job queue management

### 2. Embedding Queue (`src/queues/embedding.queue.ts`)
- Defines the BullMQ queue for embedding processing
- Job configuration:
  - **Attempts**: 3 retries on failure
  - **Backoff**: Exponential (starts at 2 seconds)
  - **Cleanup**: Auto-removes completed jobs

### 3. Embedding Worker (`src/workers/embedding.worker.ts`)
- Processes jobs from the queue
- Steps:
  1. Combines content fields for embedding
  2. Calls Gemini API to generate embedding vector
  3. Stores embedding in Qdrant
- Concurrency: 5 jobs at once
- Rate limit: 10 jobs per second

### 4. Updated Content Service (`src/services/content.service.qdrant.ts`)
- **`createContentItem()`** - NEW: Async method (saves to DB + enqueues job)
- **`createContentItemSync()`** - Legacy: Synchronous method (waits for embedding)

## Prerequisites

### 1. Install Redis

#### Using Docker (Recommended)
```bash
docker run -d --name redis -p 6379:6379 redis:latest
```

#### Or add to docker-compose.yml
```yaml
version: '3.8'

services:
  redis:
    image: redis:latest
    container_name: appointy-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

Then run:
```bash
docker-compose up -d redis
```

### 2. Update Environment Variables

Copy `.env.example` to `.env` and configure Redis:

```env
# Redis Configuration (for BullMQ job queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 3. Install Dependencies

Dependencies are already installed. If needed:
```bash
npm install bullmq ioredis
```

## Usage

### Starting the Server

When you start the server, the BullMQ worker starts automatically:

```bash
npm run dev
```

You should see:
```
✓ Connected to Redis
✓ Embedding Queue initialized
✓ Embedding Worker started and listening for jobs
🚀 Server is running on port 3000
   Background Jobs: Enabled (BullMQ + Redis)
```

### Creating Content (API Call)

The `/api/content` POST endpoint now returns immediately after saving to PostgreSQL:

```bash
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Article",
    "content": "This is some content about AI and machine learning",
    "type": "article"
  }'
```

**Response** (Fast - ~200-500ms):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "My Article",
    "content": "This is some content about AI and machine learning",
    "type": "article",
    "createdAt": "2025-01-08T10:30:00.000Z"
  }
}
```

### Background Processing

After the response is sent, the worker processes the job in the background:

1. Worker picks up job from Redis queue
2. Fetches content by ID from PostgreSQL
3. Generates embeddings via Gemini API (~1-3 seconds)
4. Stores embedding in Qdrant

**Console logs:**
```
✓ Content 123 saved to PostgreSQL and queued for embedding processing
Processing embedding job for content ID: 123
Generated embedding vector for content 123 (dimension: 768)
✓ Successfully stored embedding for content 123 in Qdrant
✓ Job 1 completed for content ID: 123
```

## Monitoring

### Queue Status

You can add a monitoring endpoint to check queue status:

```typescript
// In routes/content.routes.ts
router.get('/queue/status', async (req, res) => {
  const waiting = await embeddingQueue.getWaitingCount();
  const active = await embeddingQueue.getActiveCount();
  const completed = await embeddingQueue.getCompletedCount();
  const failed = await embeddingQueue.getFailedCount();

  res.json({
    waiting,
    active,
    completed,
    failed,
  });
});
```

### Redis CLI

Check jobs in Redis:
```bash
docker exec -it redis redis-cli
> KEYS bull:embedding-processing:*
> LLEN bull:embedding-processing:wait
```

## Error Handling

### Retry Logic
- Failed jobs automatically retry up to 3 times
- Exponential backoff (2s, 4s, 8s)
- Failed jobs remain in Redis for debugging

### Check Failed Jobs

```typescript
const failedJobs = await embeddingQueue.getFailed();
console.log('Failed jobs:', failedJobs);
```

## Performance Comparison

### Before (Synchronous)
- Average response time: ~2-5 seconds
- Blocking operation
- If Gemini API is slow, user waits

### After (Asynchronous with BullMQ)
- Average response time: ~200-500ms (4-10x faster!)
- Non-blocking operation
- User gets immediate confirmation
- Background processing doesn't affect response time

## Troubleshooting

### Redis Connection Issues

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:**
1. Make sure Redis is running: `docker ps | grep redis`
2. Start Redis: `docker start redis` or `docker-compose up -d redis`
3. Check Redis connection: `docker exec -it redis redis-cli PING` (should return `PONG`)

### Worker Not Processing Jobs

1. Check if worker is running (should see "Embedding Worker started" in console)
2. Check Redis connection
3. Check queue status: `embeddingQueue.getWaitingCount()`
4. Check worker logs for errors

### Jobs Stuck in Queue

```bash
# Clear all jobs
const jobs = await embeddingQueue.getJobs();
await Promise.all(jobs.map(job => job.remove()));
```

## Advanced Configuration

### Adjust Concurrency

In `src/workers/embedding.worker.ts`:
```typescript
const embeddingWorker = new Worker(
  'embedding-processing',
  async (job) => { /* ... */ },
  {
    connection,
    concurrency: 10, // Increase to process more jobs simultaneously
  }
);
```

### Adjust Rate Limiting

In `src/workers/embedding.worker.ts`:
```typescript
{
  limiter: {
    max: 20, // Maximum 20 jobs
    duration: 1000, // Per second
  },
}
```

## Testing

### Test Queue Manually

```typescript
import embeddingQueue from './src/queues/embedding.queue';

// Add a test job
await embeddingQueue.add('test-job', {
  contentId: 123,
  title: 'Test',
  type: 'article',
  labels: [],
});

console.log('Test job added!');
```

## Notes

- The original synchronous method `createContentItemSync()` is still available if needed
- Semantic search works immediately even if embedding is not yet generated (will be indexed when ready)
- Background processing is only enabled when `USE_PRISMA=true`
- Jobs are persisted in Redis, so they survive server restarts
