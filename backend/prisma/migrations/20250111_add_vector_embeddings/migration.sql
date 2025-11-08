-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add new columns to existing content_items table
ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS meta_tags JSONB;

-- Create content_embeddings table for vector storage
CREATE TABLE IF NOT EXISTS content_embeddings (
    id SERIAL PRIMARY KEY,
    content_id INTEGER UNIQUE NOT NULL,
    embedding vector(768),  -- Google Gemini text-embedding-004 produces 768-dimensional vectors
    combined_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_content
        FOREIGN KEY(content_id)
        REFERENCES content_items(id)
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_content_embeddings_content_id ON content_embeddings(content_id);

-- Create index for vector similarity search using cosine distance
CREATE INDEX IF NOT EXISTS idx_content_embeddings_vector ON content_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);  -- Adjust lists parameter based on your data size

-- Create a trigger to automatically update updated_at for content_embeddings
CREATE TRIGGER update_content_embeddings_updated_at
    BEFORE UPDATE ON content_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
