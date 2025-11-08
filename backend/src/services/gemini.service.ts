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
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
   */
  async analyzeImageContent(imageUrl: string): Promise<GeminiAnalysisResult> {
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
      // For image analysis, we need to fetch the image and convert it to the right format
      // This is a simplified version - in production, you'd handle image fetching properly
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageUrl // In production, this should be base64 encoded image data
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
}

export default new GeminiService();
