# API Usage Examples

This document provides practical examples for using the Content API.

## Setup

Make sure the server is running:
```bash
npm run dev
```

The server will be available at `http://localhost:3000`

## 1. Upload an Image

Upload an image file and let AI analyze it:

```bash
curl -X POST http://localhost:3000/api/content/upload-image \
  -F "image=@/path/to/your/image.jpg" \
  -F "title=Optional Custom Title"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "type": "image",
    "title": "AI Generated Title",
    "description": "AI Generated Description",
    "imageUrl": "/uploads/images/image-1699456789123-987654321.jpg",
    "metadata": {
      "tags": ["nature", "landscape", "mountains"],
      "category": "photo",
      "colors": ["blue", "green", "white"],
      "objects": ["mountain", "sky", "trees"],
      "scene": "Mountain landscape with blue sky"
    },
    "labels": ["nature", "outdoor", "landscape"],
    "createdAt": "2025-11-08T10:30:00.000Z"
  },
  "message": "Image uploaded and analyzed successfully"
}
```

The uploaded image will be stored at `uploads/images/` and accessible at:
`http://localhost:3000/uploads/images/image-1699456789123-987654321.jpg`

## 2. Create Text Content

Save text content with AI categorization:

```bash
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "content": "How to build a REST API with Node.js and Express. This tutorial covers setting up routes, middleware, and database connections.",
    "title": "Building REST APIs"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "type": "tutorial",
    "title": "Building REST APIs",
    "description": "A guide to building REST APIs with Node.js and Express",
    "content": "How to build a REST API with Node.js and Express...",
    "metadata": {
      "tags": ["nodejs", "express", "api", "tutorial"],
      "category": "technical",
      "language": "en",
      "sentiment": "neutral"
    },
    "labels": ["programming", "backend", "tutorial"],
    "createdAt": "2025-11-08T10:35:00.000Z"
  }
}
```

## 3. Save a URL

Save a URL reference with optional content preview:

```bash
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article",
    "content": "This is a preview of the article content..."
  }'
```

## 4. Reference an Already Uploaded Image

If you already uploaded an image, you can create a new content item referencing it:

```bash
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "/uploads/images/image-1699456789123-987654321.jpg",
    "title": "My Custom Title"
  }'
```

The system will re-analyze the local image and create a new content entry.

## 5. Get All Content Items

Retrieve all saved content:

```bash
curl http://localhost:3000/api/content
```

**With filters:**

```bash
# Filter by type
curl "http://localhost:3000/api/content?type=image"

# Filter by labels
curl "http://localhost:3000/api/content?labels=programming"

# Pagination
curl "http://localhost:3000/api/content?limit=10&offset=0"

# Combined filters
curl "http://localhost:3000/api/content?type=tutorial&labels=programming&limit=5"
```

## 6. Get Content by ID

```bash
curl http://localhost:3000/api/content/1
```

## 7. Update Content

```bash
curl -X PUT http://localhost:3000/api/content/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "labels": ["new-label", "updated"]
  }'
```

## 8. Delete Content

```bash
curl -X DELETE http://localhost:3000/api/content/1
```

## Using with JavaScript/Fetch

### Upload Image

```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('title', 'My Image Title');

const response = await fetch('http://localhost:3000/api/content/upload-image', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

### Create Text Content

```javascript
const response = await fetch('http://localhost:3000/api/content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Your text content here...',
    title: 'Optional Title'
  })
});

const result = await response.json();
console.log(result);
```

### Get All Content

```javascript
const response = await fetch('http://localhost:3000/api/content?type=image&limit=10');
const result = await response.json();

console.log(`Found ${result.count} items:`, result.data);
```

## AI Categorization Examples

The Gemini AI will automatically analyze and categorize your content:

### Text Content Types
- `article` - Blog posts, articles
- `tutorial` - How-to guides, tutorials
- `note` - Personal notes, reminders
- `code` - Code snippets
- `recipe` - Cooking recipes
- `review` - Product or service reviews
- And more based on content...

### Image Content Types
- `photo` - Regular photographs
- `diagram` - Technical diagrams
- `screenshot` - Screen captures
- `artwork` - Digital art, illustrations
- `chart` - Charts and graphs

### Metadata Extraction

The AI automatically extracts:
- **Tags**: Relevant keywords
- **Price**: If mentioned in content
- **Category**: Specific subcategory
- **Sentiment**: Positive/negative/neutral
- **Language**: Content language
- **Colors**: For images
- **Objects**: Detected objects in images

## Notes

- Maximum image size: 10MB
- Supported image formats: JPEG, JPG, PNG, GIF, WEBP
- Images are stored locally in `uploads/images/`
- All content is automatically analyzed by Gemini AI
- Title and description are optional - AI will generate them if not provided
