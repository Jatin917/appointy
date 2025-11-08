# Appointy Content API

A content management API powered by Google Gemini AI for automatic categorization and metadata extraction.

## Features

- Save content items (text, URLs, images) to PostgreSQL
- Automatic content categorization using Gemini AI
- AI-powered metadata extraction and labeling
- Support for text content, URLs, and images
- RESTful API endpoints for CRUD operations
- Flexible querying with filters

## Tech Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL
- Google Gemini AI
- Multer (file uploads)

## Setup Instructions

### 1. Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Google Gemini API key

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb appointy
```

Run the schema migration:

```bash
psql -d appointy -f src/db/schema.sql
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Update the `.env` file with your credentials:

```env
# Server Configuration
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=appointy
DB_USER=postgres
DB_PASSWORD=your_password

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
```

To get a Gemini API key:
1. Visit https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy it to your `.env` file

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## API Endpoints

### Create Content Item

**POST** `/api/content`

Automatically categorizes content and extracts metadata using Gemini AI.

```json
{
  "content": "This is a tutorial about building REST APIs...",
  "title": "API Tutorial",
  "description": "Learn how to build APIs"
}
```

Or with a URL:

```json
{
  "url": "https://example.com/article",
  "content": "Optional content preview..."
}
```

Or with an image URL:

```json
{
  "imageUrl": "https://example.com/image.jpg"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "type": "tutorial",
    "title": "API Tutorial",
    "description": "Learn how to build APIs",
    "content": "This is a tutorial about building REST APIs...",
    "metadata": {
      "tags": ["api", "tutorial", "programming"],
      "category": "technical",
      "language": "en"
    },
    "labels": ["tutorial", "programming", "backend"],
    "createdAt": "2025-11-08T10:30:00.000Z"
  }
}
```

### Upload Image

**POST** `/api/content/upload-image`

Upload an image file with automatic AI analysis.

```bash
curl -X POST http://localhost:3000/api/content/upload-image \
  -F "image=@/path/to/image.jpg" \
  -F "title=My Image"
```

### Get All Content Items

**GET** `/api/content`

Query parameters:
- `type` - Filter by content type
- `labels` - Filter by labels (can be array)
- `limit` - Limit results
- `offset` - Pagination offset

Examples:
```
GET /api/content
GET /api/content?type=tutorial
GET /api/content?labels=programming&limit=10
```

### Get Content Item by ID

**GET** `/api/content/:id`

```
GET /api/content/1
```

### Update Content Item

**PUT** `/api/content/:id`

```json
{
  "title": "Updated Title",
  "labels": ["new-label", "updated"]
}
```

### Delete Content Item

**DELETE** `/api/content/:id`

```
DELETE /api/content/1
```

## Data Model

### ContentItem

```typescript
{
  id: number;                    // Auto-generated
  type: string;                  // AI-categorized (e.g., "article", "tutorial", "image")
  title?: string;                // Optional, AI-generated if not provided
  description?: string;          // Optional, AI-generated if not provided
  content?: string;              // Text content
  url?: string;                  // URL reference
  imageUrl?: string;             // Image URL
  metadata: {                    // AI-extracted metadata
    price?: number;
    tags?: string[];
    category?: string;
    [key: string]: any;
  };
  labels: string[];              // AI-generated labels for categorization
  createdAt: Date;
  updatedAt: Date;
}
```

## How AI Categorization Works

1. **Text Content**: Gemini analyzes the text to determine:
   - Content type (article, note, code, tutorial, etc.)
   - Metadata (tags, sentiment, language, etc.)
   - Descriptive labels
   - Generated title/description if not provided

2. **Image Content**: Gemini analyzes the image to extract:
   - Visual tags
   - Detected objects and scenes
   - Dominant colors
   - Descriptive labels
   - Generated title and description

3. **URL Content**: Gemini analyzes the URL and preview to determine:
   - Content type
   - Domain information
   - Relevant tags and labels
   - Generated title and description

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

Error response format:
```json
{
  "error": "Error message",
  "message": "Detailed error information"
}
```

## Development

Run tests:
```bash
npm test
```

Build:
```bash
npm run build
```

## Project Structure

```
backend/
├── src/
│   ├── db/
│   │   ├── connection.ts       # Database connection
│   │   └── schema.sql          # Database schema
│   ├── routes/
│   │   └── content.routes.ts   # API routes
│   ├── services/
│   │   ├── content.service.ts  # Database operations
│   │   └── gemini.service.ts   # AI integration
│   ├── types/
│   │   └── content.types.ts    # TypeScript types
│   └── index.ts                # Application entry point
├── .env.example
├── package.json
└── tsconfig.json
```

## License

ISC
