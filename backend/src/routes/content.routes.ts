import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import contentService from '../services/content.service';
import contentServiceQdrant from '../services/content.service.qdrant';
import geminiService from '../services/gemini.service';
import { CreateContentItemRequest } from '../types/content.types';

// Use Qdrant service if USE_PRISMA env variable is set
const activeService = process.env.USE_PRISMA === 'true' ? contentServiceQdrant : contentService;

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'images');

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Configure multer for video uploads
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'videos');

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|webm|ogg|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, webm, ogg, mov, avi)'));
    }
  }
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
      // Image content - check if it's a local uploaded image
      if (imageUrl.startsWith('/uploads/images/')) {
        // Local image - read from disk and analyze
        const imagePath = path.join(process.cwd(), imageUrl.replace(/^\//, ''));

        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);
          const base64Image = imageBuffer.toString('base64');
          // Determine mime type from file extension
          const ext = path.extname(imagePath).toLowerCase();
          const mimeTypes: { [key: string]: string } = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
          };
          const mimeType = mimeTypes[ext] || 'image/jpeg';

          analysis = await geminiService.analyzeImageContent(base64Image, mimeType);
        } else {
          return res.status(400).json({ error: 'Image file not found' });
        }
      } else {
        // External image URL - store as-is without analysis for now
        // You could add external image fetching here if needed
        analysis = {
          type: 'image',
          metadata: { tags: [] },
          labels: ['external-image'],
          generatedTitle: 'External Image',
          generatedDescription: 'An external image reference'
        };
      }
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
    const contentItem = await contentServiceQdrant.createContentItem({
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

    // The image is now saved to disk at req.file.path
    const imagePath = req.file.path;
    const imageUrl = `/uploads/images/${req.file.filename}`;

    // Read the image file and convert to base64 for Gemini analysis
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;

    // Analyze the image with Gemini
    const analysis = await geminiService.analyzeImageContent(base64Image, mimeType);

    // Create the content item with the local image URL
    const contentItem = await contentServiceQdrant.createContentItem({
      type: analysis.type,
      title: req.body.title || analysis.generatedTitle,
      description: req.body.description || analysis.generatedDescription,
      imageUrl: imageUrl,
      content: req.body.content || null,
      metadata: analysis.metadata,
      labels: analysis.labels,
    });

    return res.status(201).json({
      success: true,
      data: contentItem,
      message: 'Image uploaded and analyzed successfully',
    });
  } catch (error) {
    console.error('Error uploading image:', error);

    // Clean up the uploaded file if there was an error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      error: 'Failed to upload image',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/content/upload-video
 * Upload a video and create a content item
 */
router.post('/upload-video', uploadVideo.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // The video is now saved to disk at req.file.path
    const videoPath = req.file.path;
    const videoUrl = `/uploads/videos/${req.file.filename}`;

    // For videos, we don't analyze with Gemini Vision (it's for images)
    // Instead, use text analysis based on title/description if provided
    let analysis;
    if (req.body.title || req.body.description || req.body.content) {
      const combinedText = `${req.body.title || ''} ${req.body.description || ''} ${req.body.content || ''}`.trim();
      if (combinedText) {
        analysis = await geminiService.analyzeTextContent(combinedText, req.body.title, req.body.description);
      }
    }

    // Create the content item with the local video URL
    const contentItem = await contentServiceQdrant.createContentItem({
      type: 'video',
      title: req.body.title || analysis?.generatedTitle || 'Untitled Video',
      description: req.body.description || analysis?.generatedDescription || 'A video file',
      imageUrl: videoUrl, // Store video URL in imageUrl field for now
      content: req.body.content || null,
      metadata: analysis?.metadata || { tags: [] },
      labels: analysis?.labels || ['video'],
    });

    return res.status(201).json({
      success: true,
      data: contentItem,
      message: 'Video uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading video:', error);

    // Clean up the uploaded file if there was an error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      error: 'Failed to upload video',
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

    const items = await activeService.getContentItems(filters);

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
 * GET /api/content/search
 * RAG-based semantic search - retrieves relevant content and generates AI answer
 * NOTE: This route must come BEFORE /:id to avoid "search" being treated as an ID
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    console.log("request is ", req.query)
    const { q, query, limit, threshold, type, labels, raw } = req.query;
    const searchQuery = (q || query) as string;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({
        error: 'Query parameter (q or query) is required',
      });
    }

    // Check if Qdrant service is being used
    if (process.env.USE_PRISMA !== 'true') {
      return res.status(501).json({
        error: 'Semantic search requires Qdrant service. Set USE_PRISMA=true in your .env file',
      });
    }

    const filters: any = {};
    if (type) filters.type = type as string;
    if (labels) {
      filters.labels = Array.isArray(labels) ? labels as string[] : [labels as string];
    }

    // Retrieve relevant content items from Qdrant
    const results = await contentServiceQdrant.semanticSearch(searchQuery, {
      limit: limit ? parseInt(limit as string) : 10,
      threshold: threshold ? parseFloat(threshold as string) : 0.5,
      filters,
    });

    // If raw=true, return the search results without AI processing
    if (raw === 'true') {
      return res.status(200).json({
        success: true,
        query: searchQuery,
        count: results.length,
        data: results,
      });
    }

    // If no results found, return a message
    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        query: searchQuery,
        answer: "I couldn't find any relevant information in the knowledge base to answer your query.",
        sourceCount: 0,
        sources: [],
      });
    }

    // Use Gemini to generate an answer based on the retrieved context
    const answer = await geminiService.answerQueryWithContext(searchQuery, results);

    return res.status(200).json({
      success: true,
      query: searchQuery,
      answer: answer,
      sourceCount: results.length,
      sources: results.map((item: any) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        url: item.url,
        imageUrl: item.imageUrl,
        description: item.description,
        score: item.similarity,
      })),
    });
  } catch (error) {
    console.error('Error performing semantic search:', error);
    return res.status(500).json({
      error: 'Failed to perform semantic search',
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

    const item = await activeService.getContentItemById(id);

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
    const item = await activeService.updateContentItem(id, updates);

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

    const deleted = await activeService.deleteContentItem(id);

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
