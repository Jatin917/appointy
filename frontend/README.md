# Content Library Frontend

A modern React frontend application for managing and searching content items with AI-powered semantic search.

## Features

- **Search Functionality**: Semantic search powered by AI embeddings
- **Type Filtering**: Filter content by type (text, url, image, video, document)
- **Responsive Design**: Mobile-friendly interface with beautiful gradients
- **Real-time Results**: Dynamic content loading and search results
- **Content Cards**: Visual cards displaying content with metadata, labels, and scores

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running on `http://localhost:3000`

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will start on `http://localhost:5173` (default Vite port).

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── TopBar.tsx      # Search bar and filters
│   ├── ContentCard.tsx # Individual content item card
│   └── ContentList.tsx # Grid of content cards
├── services/           # API services
│   └── api.service.ts  # Backend API communication
├── types/              # TypeScript type definitions
│   └── content.types.ts
├── App.tsx             # Main application component
├── App.css             # Global app styles
└── index.css           # Root styles
```

## Usage

### Searching Content

1. Enter your search query in the search box at the top
2. Click "Search" or press Enter
3. View semantic search results with similarity scores

### Filtering by Type

Use the "Type" dropdown to filter content by:
- All (default)
- Text
- URL
- Image
- Video
- Document

### Viewing Content

Each content card displays:
- Content type with color-coded badge
- Title and description
- Images (if available)
- URL links (if available)
- Labels/tags
- Creation date
- Similarity score (for search results)

## API Integration

The frontend connects to the backend API at `http://localhost:3000/api`. Make sure your backend is running before starting the frontend.

### Endpoints Used

- `GET /api/content` - Fetch all content items
- `GET /api/content/search?q=query` - Semantic search
- `GET /api/content/:id` - Get specific content item

## Customization

### Changing API URL

Edit `src/services/api.service.ts`:

```typescript
const API_BASE_URL = 'http://your-backend-url/api';
```

### Styling

The application uses custom CSS with a purple gradient theme. Modify the CSS files in `src/components/` to customize the look and feel.

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Axios** - HTTP client
- **CSS3** - Styling with gradients and animations

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### CORS Errors

If you see CORS errors, ensure:
1. Backend is running on port 3000
2. Backend has CORS enabled for `http://localhost:5173`

### Images Not Loading

Check that:
1. Image URLs are correct
2. Backend is serving static files from `/uploads/images/`
3. Images exist in the backend uploads directory
