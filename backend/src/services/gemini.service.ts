import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiAnalysisResult } from '../types/content.types';

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Analyze text content to extract type, metadata, and labels
   */
  async analyzeTextContent(content: string, title?: string, description?: string): Promise<GeminiAnalysisResult> {
    const prompt = `
Analyze the following content and provide a structured response in JSON format.

Content: ${content}
${title ? `Title: ${title}` : ''}
${description ? `Description: ${description}` : ''}

Please categorize this content and extract relevant information. Return a JSON object with the following structure:
{
  "type": "category of content (e.g., article, note, code, recipe, tutorial, review, etc.)",
  "metadata": {
    "price": null or number if price information is found,
    "tags": array of relevant tags,
    "category": specific category within the type,
    "sentiment": positive/negative/neutral if applicable,
    "language": detected language,
    "any_other_relevant_fields": "extract any other useful metadata"
  },
  "labels": array of descriptive labels for categorization,
  ${!title ? '"generatedTitle": "a concise title for this content",' : ''}
  ${!description ? '"generatedDescription": "a brief description of this content"' : ''}
}

Only return the JSON object, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse Gemini response');
      }

      const analysis: GeminiAnalysisResult = JSON.parse(jsonMatch[0]);
      return analysis;
    } catch (error) {
      console.error('Error analyzing text content with Gemini:', error);
      // Return default analysis if Gemini fails
      return {
        type: 'text',
        metadata: { tags: [] },
        labels: ['uncategorized'],
      };
    }
  }

  /**
   * Analyze image to extract metadata and labels
   * @param base64Image - Base64 encoded image data
   * @param mimeType - MIME type of the image (e.g., 'image/jpeg', 'image/png')
   */
  async analyzeImageContent(base64Image: string, mimeType: string = 'image/jpeg'): Promise<GeminiAnalysisResult> {
    const prompt = `
Analyze this image and provide a structured response in JSON format.

Please describe what you see in the image and extract relevant information. Return a JSON object with the following structure:
{
  "type": "image",
  "metadata": {
    "tags": array of visual tags describing what's in the image,
    "category": specific category (e.g., photo, diagram, screenshot, artwork, etc.),
    "colors": dominant colors in the image,
    "objects": array of objects detected,
    "scene": description of the scene,
    "any_other_relevant_fields": "extract any other useful metadata"
  },
  "labels": array of descriptive labels for categorization,
  "generatedTitle": "a concise title for this image",
  "generatedDescription": "a brief description of what's in the image"
}

Only return the JSON object, no additional text.
`;

    try {
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();

      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse Gemini response');
      }

      const analysis: GeminiAnalysisResult = JSON.parse(jsonMatch[0]);
      return analysis;
    } catch (error) {
      console.error('Error analyzing image with Gemini:', error);
      // Return default analysis if Gemini fails
      return {
        type: 'image',
        metadata: { tags: [] },
        labels: ['uncategorized'],
        generatedTitle: 'Untitled Image',
        generatedDescription: 'An image',
      };
    }
  }

  /**
   * Analyze URL content
   */
  async analyzeUrlContent(url: string, content?: string): Promise<GeminiAnalysisResult> {
    const prompt = `
Analyze the following URL and its content (if provided) to categorize and extract metadata.

URL: ${url}
${content ? `Content Preview: ${content}` : ''}

Please categorize this URL and extract relevant information. Return a JSON object with the following structure:
{
  "type": "category (e.g., article, video, product, documentation, etc.)",
  "metadata": {
    "tags": array of relevant tags,
    "domain": domain name,
    "category": specific category,
    "any_other_relevant_fields": "extract any other useful metadata"
  },
  "labels": array of descriptive labels,
  "generatedTitle": "a concise title based on the URL/content",
  "generatedDescription": "a brief description"
}

Only return the JSON object, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse Gemini response');
      }

      const analysis: GeminiAnalysisResult = JSON.parse(jsonMatch[0]);
      return analysis;
    } catch (error) {
      console.error('Error analyzing URL with Gemini:', error);
      return {
        type: 'link',
        metadata: { tags: [] },
        labels: ['uncategorized'],
        generatedTitle: url,
        generatedDescription: 'A web link',
      };
    }
  }

  /**
   * Answer a query based on retrieved context (RAG pattern)
   * @param query - User's search query
   * @param contextItems - Array of relevant content items retrieved from the database
   * @returns AI-generated answer based on the context
   */
  async answerQueryWithContext(query: string, contextItems: any[]): Promise<string> {
    // Format context items into a readable format for Gemini
    const contextText = contextItems.map((item, index) => {
      const parts = [`[Document ${index + 1}]`];

      if (item.title) parts.push(`Title: ${item.title}`);
      if (item.type) parts.push(`Type: ${item.type}`);
      if (item.description) parts.push(`Description: ${item.description}`);
      if (item.content) parts.push(`Content: ${item.content}`);
      if (item.url) parts.push(`URL: ${item.url}`);
      if (item.imageUrl) parts.push(`Image URL: ${item.imageUrl}`);
      if (item.labels && item.labels.length > 0) {
        parts.push(`Labels: ${item.labels.join(', ')}`);
      }
      if (item.metadata) {
        try {
          const metadata = typeof item.metadata === 'string'
            ? JSON.parse(item.metadata)
            : item.metadata;
          if (metadata.tags && metadata.tags.length > 0) {
            parts.push(`Tags: ${metadata.tags.join(', ')}`);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      return parts.join('\n');
    }).join('\n\n---\n\n');

    const prompt = `You are a helpful AI assistant. Based on the following context from a knowledge base, answer the user's query.

CONTEXT:
${contextText}

USER QUERY: ${query}

Please provide a clear, concise, and helpful answer based ONLY on the information provided in the context above. If the context doesn't contain enough information to answer the query, say so clearly. Include relevant details, links, or references from the context when appropriate.

ANSWER:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const answer = response.text();

      return answer.trim();
    } catch (error) {
      console.error('Error generating answer with Gemini:', error);
      throw new Error('Failed to generate answer from context');
    }
  }
}

export default new GeminiService();
