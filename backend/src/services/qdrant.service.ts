import { QdrantClient } from '@qdrant/qdrant-js';

/**
 * Service for interacting with Qdrant vector database
 */
class QdrantService {
  private client: QdrantClient;
  private collectionName = 'content_embeddings';
  private vectorSize = 768; // Google Gemini text-embedding-004 dimension

  constructor() {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    this.client = new QdrantClient({ url: qdrantUrl });
  }

  /**
   * Initialize collection (create if doesn't exist)
   */
  async initializeCollection(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (col) => col.name === this.collectionName
      );

      if (!exists) {
        console.log(`Creating Qdrant collection: ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine', // Cosine similarity for semantic search
          },
        });
        console.log(`✅ Collection ${this.collectionName} created`);
      } else {
        console.log(`✓ Collection ${this.collectionName} already exists`);
      }
    } catch (error) {
      console.error('Error initializing Qdrant collection:', error);
      throw new Error('Failed to initialize Qdrant collection');
    }
  }

  /**
   * Store or update an embedding vector
   * @param contentId - PostgreSQL content ID
   * @param embedding - 768-dimensional vector
   * @param metadata - Additional metadata to store
   */
  async upsertEmbedding(
    contentId: number,
    embedding: number[],
    metadata: {
      title?: string;
      type?: string;
      labels?: string[];
      combinedText?: string;
    }
  ): Promise<void> {
    try {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: contentId,
            vector: embedding,
            payload: {
              contentId,
              title: metadata.title || '',
              type: metadata.type || '',
              labels: metadata.labels || [],
              combinedText: metadata.combinedText || '',
              updatedAt: new Date().toISOString(),
            },
          },
        ],
      });
    } catch (error) {
      console.error('Error upserting embedding to Qdrant:', error);
      throw new Error('Failed to store embedding in Qdrant');
    }
  }

  /**
   * Search for similar vectors
   * @param queryEmbedding - Query vector
   * @param options - Search options
   * @returns Array of content IDs with similarity scores
   */
  async searchSimilar(
    queryEmbedding: number[],
    options: {
      limit?: number;
      scoreThreshold?: number;
      filter?: {
        type?: string;
        labels?: string[];
      };
    } = {}
  ): Promise<Array<{ contentId: number; score: number }>> {
    try {
      const limit = options.limit || 10;
      const scoreThreshold = options.scoreThreshold || 0.5;

      // Build filter if provided
      let filter: any = undefined;
      if (options.filter) {
        const conditions: any[] = [];

        if (options.filter.type) {
          conditions.push({
            key: 'type',
            match: { value: options.filter.type },
          });
        }

        if (options.filter.labels && options.filter.labels.length > 0) {
          conditions.push({
            key: 'labels',
            match: { any: options.filter.labels },
          });
        }

        if (conditions.length > 0) {
          filter = {
            must: conditions,
          };
        }
      }

      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit,
        score_threshold: scoreThreshold,
        filter,
        with_payload: false, // We only need IDs and scores
      });

      return searchResult.map((result) => ({
        contentId: result.id as number,
        score: result.score,
      }));
    } catch (error) {
      console.error('Error searching in Qdrant:', error);
      throw new Error('Failed to search in Qdrant');
    }
  }

  /**
   * Delete an embedding by content ID
   * @param contentId - PostgreSQL content ID
   */
  async deleteEmbedding(contentId: number): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [contentId],
      });
    } catch (error) {
      console.error('Error deleting embedding from Qdrant:', error);
      throw new Error('Failed to delete embedding from Qdrant');
    }
  }

  /**
   * Delete multiple embeddings by content IDs
   * @param contentIds - Array of PostgreSQL content IDs
   */
  async deleteEmbeddings(contentIds: number[]): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: contentIds,
      });
    } catch (error) {
      console.error('Error deleting embeddings from Qdrant:', error);
      throw new Error('Failed to delete embeddings from Qdrant');
    }
  }

  /**
   * Get collection info and stats
   */
  async getCollectionInfo() {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      console.error('Error getting collection info:', error);
      return null;
    }
  }

  /**
   * Check if Qdrant is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      console.error('Qdrant health check failed:', error);
      return false;
    }
  }
}

export default new QdrantService();
