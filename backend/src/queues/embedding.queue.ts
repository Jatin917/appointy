import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Job data interface
export interface EmbeddingJobData {
  contentId: number;
  title?: string;
  description?: string;
  content?: string;
  labels: string[];
  metadata?: Record<string, any>;
  summary?: string;
  metaTags?: Record<string, any>;
  type: string;
}

// Redis connection for BullMQ
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

// Create BullMQ Queue
export const embeddingQueue = new Queue<EmbeddingJobData>('embedding-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds delay
    },
    removeOnComplete: true, // Remove job from queue when completed
    removeOnFail: false, // Keep failed jobs for debugging
  },
});

// Log queue events
embeddingQueue.on('error', (error) => {
  console.error('Embedding Queue Error:', error);
});

console.log('✓ Embedding Queue initialized');

export default embeddingQueue;
