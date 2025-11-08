import pool from '../db/connection';
import { ContentItem } from '../types/content.types';

class ContentService {
  /**
   * Create a new content item
   */
  async createContentItem(item: ContentItem): Promise<ContentItem> {
    const query = `
      INSERT INTO content_items (
        type, title, description, content, url, image_url, metadata, labels
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      item.type,
      item.title || null,
      item.description || null,
      item.content || null,
      item.url || null,
      item.imageUrl || null,
      JSON.stringify(item.metadata || {}),
      item.labels || [],
    ];

    try {
      const result = await pool.query(query, values);
      return this.mapRowToContentItem(result.rows[0]);
    } catch (error) {
      console.error('Error creating content item:', error);
      throw new Error('Failed to create content item');
    }
  }

  /**
   * Get content item by ID
   */
  async getContentItemById(id: number): Promise<ContentItem | null> {
    const query = 'SELECT * FROM content_items WHERE id = $1';

    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToContentItem(result.rows[0]);
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
    let query = 'SELECT * FROM content_items WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (filters?.type) {
      query += ` AND type = $${paramCount}`;
      values.push(filters.type);
      paramCount++;
    }

    if (filters?.labels && filters.labels.length > 0) {
      query += ` AND labels && $${paramCount}`;
      values.push(filters.labels);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
      paramCount++;
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
      paramCount++;
    }

    try {
      const result = await pool.query(query, values);
      return result.rows.map(row => this.mapRowToContentItem(row));
    } catch (error) {
      console.error('Error getting content items:', error);
      throw new Error('Failed to get content items');
    }
  }

  /**
   * Update content item
   */
  async updateContentItem(id: number, updates: Partial<ContentItem>): Promise<ContentItem | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.type !== undefined) {
      fields.push(`type = $${paramCount}`);
      values.push(updates.type);
      paramCount++;
    }

    if (updates.title !== undefined) {
      fields.push(`title = $${paramCount}`);
      values.push(updates.title);
      paramCount++;
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramCount}`);
      values.push(updates.description);
      paramCount++;
    }

    if (updates.content !== undefined) {
      fields.push(`content = $${paramCount}`);
      values.push(updates.content);
      paramCount++;
    }

    if (updates.url !== undefined) {
      fields.push(`url = $${paramCount}`);
      values.push(updates.url);
      paramCount++;
    }

    if (updates.imageUrl !== undefined) {
      fields.push(`image_url = $${paramCount}`);
      values.push(updates.imageUrl);
      paramCount++;
    }

    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramCount}`);
      values.push(JSON.stringify(updates.metadata));
      paramCount++;
    }

    if (updates.labels !== undefined) {
      fields.push(`labels = $${paramCount}`);
      values.push(updates.labels);
      paramCount++;
    }

    if (fields.length === 0) {
      return this.getContentItemById(id);
    }

    const query = `
      UPDATE content_items
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToContentItem(result.rows[0]);
    } catch (error) {
      console.error('Error updating content item:', error);
      throw new Error('Failed to update content item');
    }
  }

  /**
   * Delete content item
   */
  async deleteContentItem(id: number): Promise<boolean> {
    const query = 'DELETE FROM content_items WHERE id = $1 RETURNING id';

    try {
      const result = await pool.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting content item:', error);
      throw new Error('Failed to delete content item');
    }
  }

  /**
   * Map database row to ContentItem object
   */
  private mapRowToContentItem(row: any): ContentItem {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      content: row.content,
      url: row.url,
      imageUrl: row.image_url,
      metadata: row.metadata,
      labels: row.labels,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new ContentService();
