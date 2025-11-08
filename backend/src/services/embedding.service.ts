import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { JsonArray } from '@prisma/client/runtime/library';

/**
 * Service for generating text embeddings using Google Gemini
 */
class EmbeddingService {
  private genAI: GoogleGenerativeAI;
  private embeddingModel: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use Google's text-embedding-004 model which produces 768-dimensional vectors
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  /**
   * Generate embedding for a single text
   * @param text - The text to generate embedding for
   * @param taskType - The task type for the embedding (default: RETRIEVAL_DOCUMENT)
   * @returns A 768-dimensional vector
   */
  async generateEmbedding(
    text: string,
    taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT
  ): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      const result = await this.embeddingModel.embedContent({
        content: { parts: [{ text }] },
        taskType,
      });

      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to generate embeddings for
   * @param taskType - The task type for the embeddings (default: RETRIEVAL_DOCUMENT)
   * @returns Array of 768-dimensional vectors
   */
  async generateEmbeddings(
    texts: string[],
    taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT
  ): Promise<number[][]> {
    try {
      if (!texts || texts.length === 0) {
        throw new Error('Texts array cannot be empty');
      }

      const embeddings = await Promise.all(
        texts.map(text => this.generateEmbedding(text, taskType))
      );

      return embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error('Failed to generate embeddings');
    }
  }

  /**
   * Generate embedding for a search query
   * @param query - The search query
   * @returns A 768-dimensional vector optimized for search
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    return this.generateEmbedding(query, TaskType.RETRIEVAL_QUERY);
  }

  /**
   * Combine content fields into a single text for embedding
   * @param title - Content title
   * @param description - Content description
   * @param content - Main content text
   * @param tags - Array of tags
   * @param summary - Content summary
   * @returns Combined text suitable for embedding
   */
  combineContentForEmbedding(
    title?: string,
    description?: string,
    content?: string,
    tags?: string[],
    metaTags?:any,
    metadata?:any,
    summary?: string
  ): string {
    const parts: string[] = [];

    if (title) {
      parts.push(`Title: ${title}`);
    }

    if (summary) {
      parts.push(`Summary: ${summary}`);
    }

    if (description) {
      parts.push(`Description: ${description}`);
    }

    if (tags && tags.length > 0) {
      parts.push(`Tags: ${tags.join(', ')}`);
    }
    if (metaTags) {
      parts.push(`MetaTags:${metaTags}`);
    }
    if (metadata ) {
      parts.push(`MetaTags:${metadata}`);
    }

    if (content) {
      // Limit content to avoid token limits (approximately 2000 chars)
      const truncatedContent = content.length > 2000 ? content.substring(0, 2000) + '...' : content;
      parts.push(`Content: ${truncatedContent}`);
    }

    return parts.join('\n\n');
  }
}

export default new EmbeddingService();
