import prisma from '../lib/prisma';
import { ContentItem } from '../types/content.types';
import embeddingService from './embedding.service';
import pool from '../db/connection';

/**
 * Content Service using Prisma ORM with vector embeddings
 */
class ContentServicePrisma {
  /**
   * Create a new content item with embedding
   * Flow: Store in PostgreSQL -> Get ID -> Generate embedding -> Store in vector DB
   */
  async createContentItem(item: ContentItem): Promise<ContentItem> {
    try {
      // Step 1: Store data in PostgreSQL using Prisma and get the ID
      const createdContent = await prisma.contentItem.create({
        data: {
          type: item.type,
          title: item.title || null,
          description: item.description || null,
          content: item.content || null,
          url: item.url || null,
          imageUrl: item.imageUrl || null,
          metadata: item.metadata || {},
          labels: item.labels || [],
          summary: item.description || null, // You can generate a summary here if needed
          metaTags: item.metadata ? item.metadata : undefined,
        },
      });

      // Step 2: Combine text fields for embedding
      const combinedText = embeddingService.combineContentForEmbedding(
        createdContent.title || undefined,
        createdContent.description || undefined,
        createdContent.content || undefined,
        createdContent.labels,
        createdContent.summary || undefined
      );

      // Step 3: Generate embedding vector
      const embeddingVector = await embeddingService.generateEmbedding(combinedText);

      // Step 4: Store embedding in vector database with the same ID
      await this.storeEmbedding(createdContent.id, embeddingVector, combinedText);

      return this.mapPrismaToContentItem(createdContent);
    } catch (error) {
      console.error('Error creating content item:', error);
      throw new Error('Failed to create content item');
    }
  }

  /**
   * Store embedding in the content_embeddings table
   */
  private async storeEmbedding(
    contentId: number,
    embedding: number[],
    combinedText: string
  ): Promise<void> {
    try {
      // Use raw SQL to insert vector data since Prisma doesn't fully support pgvector yet
      const vectorString = `[${embedding.join(',')}]`;

      await pool.query(
        `INSERT INTO content_embeddings (content_id, embedding, combined_text)
         VALUES ($1, $2::vector, $3)
         ON CONFLICT (content_id)
         DO UPDATE SET
           embedding = $2::vector,
           combined_text = $3,
           updated_at = CURRENT_TIMESTAMP`,
        [contentId, vectorString, combinedText]
      );
    } catch (error) {
      console.error('Error storing embedding:', error);
      throw new Error('Failed to store embedding');
    }
  }

  /**
   * Get content item by ID
   */
  async getContentItemById(id: number): Promise<ContentItem | null> {
    try {
      const content = await prisma.contentItem.findUnique({
        where: { id },
      });

      if (!content) {
        return null;
      }

      return this.mapPrismaToContentItem(content);
    } catch (error) {
      console.error('Error getting content item:', error);
      throw new Error('Failed to get content item');
    }
  }

  /**
   * Get all content items with optional filtering
   */
  async getContentItems(filters?: {
    type?: string;
    labels?: string[];
    limit?: number;
    offset?: number;
  }): Promise<ContentItem[]> {
    try {
      const whereClause: any = {};

      if (filters?.type) {
        whereClause.type = filters.type;
      }

      if (filters?.labels && filters.labels.length > 0) {
        whereClause.labels = {
          hasSome: filters.labels,
        };
      }

      const items = await prisma.contentItem.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit,
        skip: filters?.offset,
      });

      return items.map(item => this.mapPrismaToContentItem(item));
    } catch (error) {
      console.error('Error getting content items:', error);
      throw new Error('Failed to get content items');
    }
  }

  /**
   * Update content item and its embedding
   */
  async updateContentItem(id: number, updates: Partial<ContentItem>): Promise<ContentItem | null> {
    try {
      // Update in PostgreSQL
      const updatedContent = await prisma.contentItem.update({
        where: { id },
        data: {
          ...(updates.type !== undefined && { type: updates.type }),
          ...(updates.title !== undefined && { title: updates.title }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.content !== undefined && { content: updates.content }),
          ...(updates.url !== undefined && { url: updates.url }),
          ...(updates.imageUrl !== undefined && { imageUrl: updates.imageUrl }),
          ...(updates.metadata !== undefined && { metadata: updates.metadata }),
          ...(updates.labels !== undefined && { labels: updates.labels }),
        },
      });

      // Regenerate embedding if text content changed
      if (
        updates.title !== undefined ||
        updates.description !== undefined ||
        updates.content !== undefined ||
        updates.labels !== undefined
      ) {
        const combinedText = embeddingService.combineContentForEmbedding(
          updatedContent.title || undefined,
          updatedContent.description || undefined,
          updatedContent.content || undefined,
          updatedContent.labels,
          updatedContent.summary || undefined
        );

        const embeddingVector = await embeddingService.generateEmbedding(combinedText);
        await this.storeEmbedding(updatedContent.id, embeddingVector, combinedText);
      }

      return this.mapPrismaToContentItem(updatedContent);
    } catch (error) {
      console.error('Error updating content item:', error);
      throw new Error('Failed to update content item');
    }
  }

  /**
   * Delete content item (embedding will be cascade deleted)
   */
  async deleteContentItem(id: number): Promise<boolean> {
    try {
      await prisma.contentItem.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      console.error('Error deleting content item:', error);
      return false;
    }
  }

  /**
   * Semantic search using vector similarity
   * Flow: Query -> Generate embedding -> Search vector DB -> Get top IDs -> Fetch full data from PostgreSQL
   */
  async semanticSearch(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      filters?: {
        type?: string;
        labels?: string[];
      };
    } = {}
  ): Promise<Array<ContentItem & { similarity: number }>> {
    try {
      const limit = options.limit || 10;
      const threshold = options.threshold || 0.5; // Minimum similarity threshold

      // Step 1: Generate embedding for the search query
      const queryEmbedding = await embeddingService.generateQueryEmbedding(query);
      const vectorString = `[${queryEmbedding.join(',')}]`;

      // Step 2: Search in vector database using cosine similarity
      // Get top matching content IDs from vector database
      let sqlQuery = `
        SELECT
          ce.content_id,
          1 - (ce.embedding <=> $1::vector) as similarity
        FROM content_embeddings ce
        WHERE 1 - (ce.embedding <=> $1::vector) > $2
      `;

      const params: any[] = [vectorString, threshold];
      let paramCount = 3;

      // Add filters if provided
      if (options.filters?.type || (options.filters?.labels && options.filters.labels.length > 0)) {
        sqlQuery += `
          JOIN content_items ci ON ce.content_id = ci.id
          WHERE 1=1
        `;

        if (options.filters.type) {
          sqlQuery += ` AND ci.type = $${paramCount}`;
          params.push(options.filters.type);
          paramCount++;
        }

        if (options.filters.labels && options.filters.labels.length > 0) {
          sqlQuery += ` AND ci.labels && $${paramCount}`;
          params.push(options.filters.labels);
          paramCount++;
        }
      }

      sqlQuery += `
        ORDER BY similarity DESC
        LIMIT $${paramCount}
      `;
      params.push(limit);

      const result = await pool.query(sqlQuery, params);

      if (result.rows.length === 0) {
        return [];
      }

      // Step 3: Get content IDs from vector search results
      const contentIds = result.rows.map(row => row.content_id);
      const similarities = new Map(
        result.rows.map(row => [row.content_id, parseFloat(row.similarity)])
      );

      // Step 4: Fetch full content data from PostgreSQL using Prisma
      const contents = await prisma.contentItem.findMany({
        where: {
          id: {
            in: contentIds,
          },
        },
      });

      // Step 5: Combine content with similarity scores and sort by similarity
      const results = contents.map(content => ({
        ...this.mapPrismaToContentItem(content),
        similarity: similarities.get(content.id) || 0,
      }));

      // Sort by similarity (highest first)
      results.sort((a, b) => b.similarity - a.similarity);

      return results;
    } catch (error) {
      console.error('Error performing semantic search:', error);
      throw new Error('Failed to perform semantic search');
    }
  }

  /**
   * Map Prisma model to ContentItem type
   */
  private mapPrismaToContentItem(prismaItem: any): ContentItem {
    return {
      id: prismaItem.id,
      type: prismaItem.type,
      title: prismaItem.title,
      description: prismaItem.description,
      content: prismaItem.content,
      url: prismaItem.url,
      imageUrl: prismaItem.imageUrl,
      metadata: prismaItem.metadata,
      labels: prismaItem.labels,
      createdAt: prismaItem.createdAt,
      updatedAt: prismaItem.updatedAt,
    };
  }
}

export default new ContentServicePrisma();
