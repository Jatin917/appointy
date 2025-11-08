# Vector Search Usage Examples

This document provides practical examples for using the vector search system.

## Table of Contents
1. [Setup](#setup)
2. [Creating Content](#creating-content)
3. [Semantic Search](#semantic-search)
4. [Advanced Search](#advanced-search)
5. [Integration Examples](#integration-examples)

## Setup

Make sure your `.env` file has:
```env
USE_PRISMA=true
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/appointy
GEMINI_API_KEY=your_actual_api_key
```

Start the server:
```bash
npm run dev
```

## Creating Content

### Example 1: Create a Tutorial Article

```bash
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started with Machine Learning",
    "description": "A beginner-friendly introduction to ML concepts",
    "content": "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. In this tutorial, we will cover the basics of supervised learning, unsupervised learning, and reinforcement learning...",
    "labels": ["machine-learning", "tutorial", "ai", "beginner"],
    "metadata": {
      "author": "John Doe",
      "difficulty": "beginner",
      "readTime": "10 minutes",
      "tags": ["ML", "AI", "Tutorial"]
    }
  }'
```

### Example 2: Create a Recipe

```bash
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Classic Chocolate Chip Cookies",
    "description": "Traditional homemade chocolate chip cookies",
    "content": "Ingredients: 2 cups flour, 1 cup butter, 1 cup sugar, 2 eggs, 2 cups chocolate chips. Instructions: Mix butter and sugar, add eggs, mix in flour, fold in chocolate chips, bake at 350°F for 12 minutes.",
    "labels": ["recipe", "dessert", "baking", "cookies"],
    "metadata": {
      "cuisine": "American",
      "prepTime": "15 minutes",
      "cookTime": "12 minutes",
      "servings": 24,
      "tags": ["chocolate", "sweet", "easy"]
    }
  }'
```

### Example 3: Create a Product Review

```bash
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "title": "iPhone 15 Pro Review",
    "description": "Comprehensive review of Apple iPhone 15 Pro",
    "content": "The iPhone 15 Pro brings impressive upgrades including the new A17 Pro chip, titanium design, and Action button. The camera system excels in low light, and the battery life is excellent...",
    "labels": ["review", "technology", "smartphone", "apple"],
    "metadata": {
      "rating": 4.5,
      "price": 999,
      "category": "Electronics",
      "tags": ["iPhone", "Apple", "5G", "Mobile"]
    }
  }'
```

## Semantic Search

### Example 1: Simple Search

Find articles about AI and machine learning:

```bash
curl "http://localhost:3000/api/content/search?q=artificial%20intelligence%20and%20deep%20learning&limit=5"
```

Response:
```json
{
  "success": true,
  "query": "artificial intelligence and deep learning",
  "count": 3,
  "data": [
    {
      "id": 1,
      "type": "article",
      "title": "Getting Started with Machine Learning",
      "description": "A beginner-friendly introduction to ML concepts",
      "content": "...",
      "labels": ["machine-learning", "tutorial", "ai"],
      "similarity": 0.89,
      "createdAt": "2025-01-11T10:00:00Z"
    }
  ]
}
```

### Example 2: Search with Filters

Search for cooking-related content only:

```bash
curl -X POST http://localhost:3000/api/content/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "easy chocolate desserts",
    "limit": 10,
    "threshold": 0.6,
    "filters": {
      "labels": ["recipe", "dessert"]
    }
  }'
```

### Example 3: High Precision Search

Search with higher threshold for more relevant results:

```bash
curl "http://localhost:3000/api/content/search?q=best%20smartphones%202024&threshold=0.75&limit=3"
```

## Advanced Search

### Example 4: Natural Language Queries

The vector search understands semantic meaning, so you can use natural language:

```bash
# Instead of: "recipe cookies chocolate"
# Use natural language:
curl "http://localhost:3000/api/content/search?q=how%20to%20make%20delicious%20chocolate%20cookies%20at%20home"
```

### Example 5: Conceptual Search

Search by concept, not just keywords:

```bash
# Find content about "learning from data" without using those exact words
curl "http://localhost:3000/api/content/search?q=algorithms%20that%20improve%20through%20experience"

# This will match ML/AI content even if it doesn't use the exact phrase
```

### Example 6: Multi-Type Search

Search across different content types:

```bash
curl -X POST http://localhost:3000/api/content/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "latest technology trends",
    "limit": 20,
    "threshold": 0.5
  }'

# Returns articles, reviews, notes, etc. about technology
```

## Integration Examples

### JavaScript/TypeScript Client

```typescript
// search.ts
interface SearchOptions {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: {
    type?: string;
    labels?: string[];
  };
}

async function searchContent(options: SearchOptions) {
  const response = await fetch('http://localhost:3000/api/content/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  const data = await response.json();
  return data;
}

// Usage
const results = await searchContent({
  query: 'best practices for React development',
  limit: 10,
  threshold: 0.6,
  filters: {
    labels: ['tutorial', 'react'],
  },
});

console.log(`Found ${results.count} results`);
results.data.forEach((item: any) => {
  console.log(`${item.title} (similarity: ${item.similarity})`);
});
```

### Python Client

```python
import requests

def search_content(query, limit=10, threshold=0.5, filters=None):
    url = 'http://localhost:3000/api/content/search'
    payload = {
        'query': query,
        'limit': limit,
        'threshold': threshold,
        'filters': filters or {}
    }

    response = requests.post(url, json=payload)
    return response.json()

# Usage
results = search_content(
    query='machine learning tutorials for beginners',
    limit=5,
    threshold=0.65,
    filters={'labels': ['tutorial', 'beginner']}
)

print(f"Found {results['count']} results")
for item in results['data']:
    print(f"{item['title']} (similarity: {item['similarity']:.2f})")
```

### React Component

```typescript
// SearchComponent.tsx
import { useState } from 'react';

interface SearchResult {
  id: number;
  title: string;
  description: string;
  similarity: number;
  labels: string[];
}

export function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/content/search?q=${encodeURIComponent(query)}&limit=10`
      );
      const data = await response.json();
      setResults(data.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>

      <div>
        {results.map((result) => (
          <div key={result.id}>
            <h3>{result.title}</h3>
            <p>{result.description}</p>
            <span>Similarity: {(result.similarity * 100).toFixed(0)}%</span>
            <div>
              {result.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Real-World Use Cases

### Use Case 1: Knowledge Base Search

```bash
# Create knowledge base articles
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "title": "How to reset your password",
    "description": "Instructions for password reset",
    "content": "To reset your password: 1. Click Forgot Password 2. Enter email 3. Check email for reset link...",
    "labels": ["faq", "account", "password"]
  }'

# Users can search naturally
curl "http://localhost:3000/api/content/search?q=I%20forgot%20my%20password%20what%20do%20I%20do"
```

### Use Case 2: E-commerce Product Search

```bash
# Add products
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Wireless Bluetooth Headphones",
    "description": "Premium noise-canceling headphones with 30-hour battery",
    "content": "Features: Active noise cancellation, wireless charging, premium sound quality...",
    "labels": ["electronics", "audio", "headphones"],
    "metadata": {"price": 299, "brand": "AudioTech"}
  }'

# Search by features or use case
curl "http://localhost:3000/api/content/search?q=headphones%20for%20long%20flights%20with%20good%20battery"
```

### Use Case 3: Document Management

```bash
# Store documents
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q4 2024 Financial Report",
    "description": "Quarterly financial results and analysis",
    "content": "Revenue increased 15% year-over-year. Operating expenses...",
    "labels": ["finance", "report", "Q4-2024"]
  }'

# Search by topic
curl "http://localhost:3000/api/content/search?q=financial%20performance%20last%20quarter&filters={\"labels\":[\"report\"]}"
```

## Performance Tips

1. **Use appropriate limits**: Start with limit=10, increase only if needed
2. **Tune threshold**:
   - 0.4-0.6: Broader results
   - 0.6-0.8: Balanced
   - 0.8-1.0: Very precise
3. **Add filters**: Use type and labels filters to narrow search scope
4. **Cache common queries**: Implement caching for frequently searched terms
5. **Batch operations**: When adding multiple items, consider batching

## Monitoring Search Quality

Track these metrics:
- Average similarity scores
- Number of results returned
- User engagement with results
- Search refinements

Adjust threshold based on user behavior and feedback.
