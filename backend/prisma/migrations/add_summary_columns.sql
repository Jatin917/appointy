-- Simple migration to add summary and meta_tags columns
-- No pgvector required - vectors are stored in Qdrant

-- Add new columns to existing content_items table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='content_items' AND column_name='summary') THEN
        ALTER TABLE content_items ADD COLUMN summary TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='content_items' AND column_name='meta_tags') THEN
        ALTER TABLE content_items ADD COLUMN meta_tags JSONB;
    END IF;
END $$;
