-- V33: Make category_id nullable on tools table
-- Tools created via automated import may not have a category assigned yet.
-- Category is metadata and should not block tool creation.
ALTER TABLE tools ALTER COLUMN category_id DROP NOT NULL;
