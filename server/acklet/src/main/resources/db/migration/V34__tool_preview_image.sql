-- Add preview_image_url column to tools table for caching screenshot URLs from microlink.io
ALTER TABLE tools ADD COLUMN IF NOT EXISTS preview_image_url VARCHAR(1024);
