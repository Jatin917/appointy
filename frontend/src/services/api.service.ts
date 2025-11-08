import axios from 'axios';
import type { ContentItem, ContentFilters, SearchParams, SearchResult, RAGSearchResponse } from '../types/content.types';

const API_BASE_URL = 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const contentApi = {
  // Create new content item
  async createContent(data: {
    title?: string;
    description?: string;
    content?: string;
    url?: string;
    imageUrl?: string;
  }): Promise<ContentItem> {
    const response = await apiClient.post('/content', data);
    return response.data.data;
  },

  // Upload image and create content item
  async uploadImage(
    imageFile: File,
    title?: string,
    description?: string,
    content?: string
  ): Promise<ContentItem> {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);
    if (content) formData.append('content', content);

    const response = await apiClient.post('/content/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Upload video and create content item
  async uploadVideo(
    videoFile: File,
    title?: string,
    description?: string,
    content?: string
  ): Promise<ContentItem> {
    const formData = new FormData();
    formData.append('video', videoFile);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);
    if (content) formData.append('content', content);

    const response = await apiClient.post('/content/upload-video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Get all content items with optional filters
  async getContent(filters?: ContentFilters): Promise<ContentItem[]> {
    const params = new URLSearchParams();

    if (filters?.type) params.append('type', filters.type);
    if (filters?.labels) {
      filters.labels.forEach(label => params.append('labels', label));
    }
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await apiClient.get(`/content?${params.toString()}`);
    return response.data.data;
  },

  // Get a specific content item by ID
  async getContentById(id: number): Promise<ContentItem> {
    const response = await apiClient.get(`/content/${id}`);
    return response.data.data;
  },

  // Semantic search (deprecated - returns raw results without AI)
  async search(params: SearchParams): Promise<SearchResult[]> {
    const response = await apiClient.post('/content/search', params);
    return response.data.data;
  },

  // RAG-based search - AI-generated answer with context
  async ragSearch(query: string, filters?: ContentFilters): Promise<RAGSearchResponse> {
    const params = new URLSearchParams();
    params.append('q', query);

    if (filters?.type) params.append('type', filters.type);
    if (filters?.labels) {
      filters.labels.forEach(label => params.append('labels', label));
    }
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`/content/search?${params.toString()}`);
    return response.data;
  },

  // Raw search results without AI processing
  async searchByQuery(query: string, filters?: ContentFilters): Promise<SearchResult[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('raw', 'true'); // Get raw results

    if (filters?.type) params.append('type', filters.type);
    if (filters?.labels) {
      filters.labels.forEach(label => params.append('labels', label));
    }
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`/content/search?${params.toString()}`);
    return response.data.data;
  },
};

export default contentApi;
