import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import embeddingService from '../services/embedding.service';
import qdrantService from '../services/qdrant.service';
import { EmbeddingJobData } from '../queues/embedding.queue';

// Redis connection for BullMQ worker
// Use REDIS_URL if provided, otherwise fall back to individual settings
const connection = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

/**
 * Process embedding jobs
 * This worker:
 * 1. Gets job with contentId from Redis queue
 * 2. Combines content fields for embedding
 * 3. Calls Gemini API to generate embedding
 * 4. Stores embedding in Qdrant VectorDB
 */
const embeddingWorker = new Worker<EmbeddingJobData>(
  'embedding-processing',
  async (job: Job<EmbeddingJobData>) => {
    const {
      contentId,
      title,
      description,
      content,
      labels,
      metadata,
      summary,
      metaTags,
      type
    } = job.data;

    console.log(`Processing embedding job for content ID: ${contentId}`);

    try {
      // Step 1: Combine text fields for embedding
      const combinedText = embeddingService.combineContentForEmbedding(
        title,
        description,
        content,
        labels,
        metaTags,
        metadata,
        summary
      );

      console.log(`Generated combined text for content ${contentId}: ${combinedText.substring(0, 100)}...`);

      // Step 2: Generate embedding vector using Gemini
      const embeddingVector = await embeddingService.generateEmbedding(combinedText);

      console.log(`Generated embedding vector for content ${contentId} (dimension: ${embeddingVector.length})`);

      // Step 3: Store embedding in Qdrant with the content ID
      await qdrantService.upsertEmbedding(contentId, embeddingVector, {
        title,
        type,
        labels,
        combinedText,
      });

      console.log(`✓ Successfully stored embedding for content ${contentId} in Qdrant`);

      return {
        success: true,
        contentId,
        message: 'Embedding processed and stored successfully',
      };
    } catch (error) {
      console.error(`Error processing embedding for content ${contentId}:`, error);
      throw error; // This will trigger a retry based on job configuration
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 jobs concurrently
    limiter: {
      max: 10, // Maximum 10 jobs
      duration: 1000, // Per second
    },
  }
);

// Worker event handlers
embeddingWorker.on('completed', (job: Job) => {
  console.log(`✓ Job ${job.id} completed for content ID: ${job.data.contentId}`);
});

embeddingWorker.on('failed', (job: Job | undefined, err: Error) => {
  if (job) {
    console.error(`✗ Job ${job.id} failed for content ID: ${job.data.contentId}`, err.message);
  } else {
    console.error(`✗ Job failed:`, err.message);
  }
});

embeddingWorker.on('error', (err: Error) => {
  console.error('Worker error:', err);
});

console.log('✓ Embedding Worker started and listening for jobs');

export default embeddingWorker;
