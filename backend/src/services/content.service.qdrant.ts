import prisma from '../lib/prisma';
import { ContentItem } from '../types/content.types';
import embeddingService from './embedding.service';
import qdrantService from './qdrant.service';
import embeddingQueue from '../queues/embedding.queue';

/**
 * Content Service using Prisma ORM with Qdrant vector database
 */
class ContentServiceQdrant {
  /**
   * Create a new content item (FAST - async processing)
   * Flow: Store in PostgreSQL -> Enqueue job to BullMQ -> Return immediately
   * The embedding generation and Qdrant storage happens asynchronously in the background
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
          summary: item.description || null,
          metaTags: item.metadata ? item.metadata : undefined,
        },
      });

      // Step 2: Enqueue job to BullMQ for async processing
      // The worker will: generate embedding -> store in Qdrant
      await embeddingQueue.add('process-embedding', {
        contentId: createdContent.id,
        title: createdContent.title || undefined,
        description: createdContent.description || undefined,
        content: createdContent.content || undefined,
        labels: createdContent.labels,
        metadata: (createdContent.metadata && typeof createdContent.metadata === 'object' && !Array.isArray(createdContent.metadata))
          ? createdContent.metadata as Record<string, any>
          : undefined,
        summary: createdContent.summary || undefined,
        metaTags: (createdContent.metaTags && typeof createdContent.metaTags === 'object' && !Array.isArray(createdContent.metaTags))
          ? createdContent.metaTags as Record<string, any>
          : undefined,
        type: createdContent.type,
      });

      console.log(`✓ Content ${createdContent.id} saved to PostgreSQL and queued for embedding processing`);

      return this.mapPrismaToContentItem(createdContent);
    } catch (error) {
      console.error('Error creating content item:', error);
      throw new Error('Failed to create content item');
    }
  }

  /**
   * Create a new content item with SYNCHRONOUS embedding (legacy method)
   * Flow: Store in PostgreSQL -> Get ID -> Generate embedding -> Store in Qdrant
   * Use this only when you need to wait for embedding completion
   */
  async createContentItemSync(item: ContentItem): Promise<ContentItem> {
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
          summary: item.description || null,
          metaTags: item.metadata ? item.metadata : undefined,
        },
      });

      // Step 2: Combine text fields for embedding
      const combinedText = embeddingService.combineContentForEmbedding(
        createdContent.title || undefined,
        createdContent.description || undefined,
        createdContent.content || undefined,
        createdContent.labels,
        createdContent.metaTags,
        createdContent.metadata || undefined,
        createdContent.summary || undefined
      );

      // Step 3: Generate embedding vector
      const embeddingVector = await embeddingService.generateEmbedding(combinedText);

      // Step 4: Store embedding in Qdrant with the same ID
      await qdrantService.upsertEmbedding(createdContent.id, embeddingVector, {
        title: createdContent.title || undefined,
        type: createdContent.type,
        labels: createdContent.labels,
        combinedText,
      });

      return this.mapPrismaToContentItem(createdContent);
    } catch (error) {
      console.error('Error creating content item:', error);
      throw new Error('Failed to create content item');
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

        await qdrantService.upsertEmbedding(updatedContent.id, embeddingVector, {
          title: updatedContent.title || undefined,
          type: updatedContent.type,
          labels: updatedContent.labels,
          combinedText,
        });
      }

      return this.mapPrismaToContentItem(updatedContent);
    } catch (error) {
      console.error('Error updating content item:', error);
      throw new Error('Failed to update content item');
    }
  }

  /**
   * Delete content item (also delete from Qdrant)
   */
  async deleteContentItem(id: number): Promise<boolean> {
    try {
      // Delete from PostgreSQL
      await prisma.contentItem.delete({
        where: { id },
      });

      // Delete from Qdrant
      await qdrantService.deleteEmbedding(id);

      return true;
    } catch (error) {
      console.error('Error deleting content item:', error);
      return false;
    }
  }

  /**
   * Semantic search using Qdrant vector similarity
   * Flow: Query -> Generate embedding -> Search Qdrant -> Get top IDs -> Fetch full data from PostgreSQL
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
      const threshold = options.threshold || 0.5;

      // Step 1: Generate embedding for the search query
      const queryEmbedding = await embeddingService.generateQueryEmbedding(query);

      // Step 2: Search in Qdrant using vector similarity
      const searchResults = await qdrantService.searchSimilar(queryEmbedding, {
        limit,
        scoreThreshold: threshold,
        filter: options.filters,
      });
      console.log("search is ", searchResults);
      if (searchResults.length === 0) {
        return [];
      }

      // Step 3: Get content IDs from Qdrant search results
      const contentIds = searchResults.map(result => result.contentId);
      const similarities = new Map(
        searchResults.map(result => [result.contentId, result.score])
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

export default new ContentServiceQdrant();
