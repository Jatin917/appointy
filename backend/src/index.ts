import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import contentRoutes from './routes/content.routes';
import qdrantService from './services/qdrant.service';
import cors from 'cors';
import './workers/embedding.worker'; // Start the BullMQ worker

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors())

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to the Appointy Content API',
    endpoints: {
      content: '/api/content',
      health: '/health'
    }
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/content', contentRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize Qdrant and start server
async function startServer() {
  try {
    // Initialize Qdrant collection if USE_PRISMA is enabled
    if (process.env.USE_PRISMA === 'true') {
      console.log('Initializing Qdrant vector database...');
      const isHealthy = await qdrantService.healthCheck();
      if (isHealthy) {
        await qdrantService.initializeCollection();
        console.log('✅ Qdrant initialized successfully');
      } else {
        console.warn('⚠️  Qdrant is not accessible. Vector search will not work.');
        console.warn('   Start Qdrant with: docker-compose up -d');
      }
    } else {
      console.log('ℹ️  Vector search disabled (USE_PRISMA=false)');
    }

    app.listen(port, () => {
      console.log(`\n🚀 Server is running on port ${port}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Vector Search: ${process.env.USE_PRISMA === 'true' ? 'Enabled (Qdrant)' : 'Disabled'}`);
      console.log(`   Background Jobs: ${process.env.USE_PRISMA === 'true' ? 'Enabled (BullMQ + Redis)' : 'Disabled'}`);
      console.log(`\n📚 API Endpoints:`);
      console.log(`   POST   /api/content - Create content (async processing)`);
      console.log(`   GET    /api/content - List content`);
      console.log(`   GET    /api/content/:id - Get content by ID`);
      console.log(`   PUT    /api/content/:id - Update content`);
      console.log(`   DELETE /api/content/:id - Delete content`);
      if (process.env.USE_PRISMA === 'true') {
        console.log(`   GET    /api/content/search?q=query - Semantic search`);
        console.log(`   POST   /api/content/search - Advanced search`);
      }
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
