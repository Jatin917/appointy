import { Router, Request, Response } from 'express';
import multer from 'multer';
import contentService from '../services/content.service';
import geminiService from '../services/gemini.service';
import { CreateContentItemRequest } from '../types/content.types';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * POST /api/content
 * Create a new content item with AI-powered categorization
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, content, url, imageUrl }: CreateContentItemRequest = req.body;

    if (!content && !url && !imageUrl) {
      return res.status(400).json({
        error: 'At least one of content, url, or imageUrl must be provided',
      });
    }

    let analysis;

    // Determine what type of content we're dealing with and analyze accordingly
    if (imageUrl) {
      // Image content
      analysis = await geminiService.analyzeImageContent(imageUrl);
    } else if (url && !content) {
      // URL content
      analysis = await geminiService.analyzeUrlContent(url, content);
    } else if (content) {
      // Text content
      analysis = await geminiService.analyzeTextContent(content, title, description);
    } else {
      return res.status(400).json({ error: 'Invalid content provided' });
    }

    // Create the content item with AI-generated data
    const contentItem = await contentService.createContentItem({
      type: analysis.type,
      title: title || analysis.generatedTitle,
      description: description || analysis.generatedDescription,
      content: content,
      url: url,
      imageUrl: imageUrl,
      metadata: analysis.metadata,
      labels: analysis.labels,
    });

    return res.status(201).json({
      success: true,
      data: contentItem,
    });
  } catch (error) {
    console.error('Error creating content item:', error);
    return res.status(500).json({
      error: 'Failed to create content item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/content/upload-image
 * Upload an image and create a content item
 */
router.post('/upload-image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // In a real application, you would:
    // 1. Upload the image to cloud storage (S3, Cloudinary, etc.)
    // 2. Get the public URL
    // For this example, we'll simulate an image URL
    const imageUrl = `https://storage.example.com/images/${Date.now()}-${req.file.originalname}`;

    // Convert image buffer to base64 for Gemini analysis
    const base64Image = req.file.buffer.toString('base64');

    // Analyze the image
    const analysis = await geminiService.analyzeImageContent(base64Image);

    // Create the content item
    const contentItem = await contentService.createContentItem({
      type: analysis.type,
      title: req.body.title || analysis.generatedTitle,
      description: req.body.description || analysis.generatedDescription,
      imageUrl: imageUrl,
      metadata: analysis.metadata,
      labels: analysis.labels,
    });

    return res.status(201).json({
      success: true,
      data: contentItem,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({
      error: 'Failed to upload image',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/content
 * Get all content items with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, labels, limit, offset } = req.query;

    const filters = {
      type: type as string | undefined,
      labels: labels ? (Array.isArray(labels) ? labels as string[] : [labels as string]) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const items = await contentService.getContentItems(filters);

    return res.status(200).json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    console.error('Error fetching content items:', error);
    return res.status(500).json({
      error: 'Failed to fetch content items',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/content/:id
 * Get a specific content item by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const item = await contentService.getContentItemById(id);

    if (!item) {
      return res.status(404).json({ error: 'Content item not found' });
    }

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error fetching content item:', error);
    return res.status(500).json({
      error: 'Failed to fetch content item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/content/:id
 * Update a content item
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const updates = req.body;
    const item = await contentService.updateContentItem(id, updates);

    if (!item) {
      return res.status(404).json({ error: 'Content item not found' });
    }

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error updating content item:', error);
    return res.status(500).json({
      error: 'Failed to update content item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/content/:id
 * Delete a content item
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const deleted = await contentService.deleteContentItem(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Content item not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Content item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting content item:', error);
    return res.status(500).json({
      error: 'Failed to delete content item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
