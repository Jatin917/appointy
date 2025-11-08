export interface ContentItem {
  id: number;
  type: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  imageUrl: string | null;
  metadata: Record<string, unknown>;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult extends ContentItem {
  score?: number;
}

export interface ContentFilters {
  type?: string;
  labels?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchParams {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: {
    type?: string;
    labels?: string[];
  };
}

// RAG Search Response (AI-generated answer with sources)
export interface RAGSearchResponse {
  success: boolean;
  query: string;
  answer: string;
  sourceCount: number;
  sources: SearchSource[];
}

export interface SearchSource {
  id: number;
  title: string;
  type: string;
  url: string | null;
  imageUrl: string | null;
  description: string | null;
  score: number;
}
