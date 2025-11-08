export interface ContentMetadata {
  price?: number;
  tags?: string[];
  [key: string]: any;
}

export interface ContentItem {
  id?: number;
  type: string;
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  imageUrl?: string;
  metadata?: ContentMetadata;
  labels?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateContentItemRequest {
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  imageUrl?: string;
}

export interface GeminiAnalysisResult {
  type: string;
  metadata: ContentMetadata;
  labels: string[];
  generatedTitle?: string;
  generatedDescription?: string;
}
