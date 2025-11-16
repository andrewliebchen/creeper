-- Migration 005: Living document support
-- Adds user edit tracking and enables document editing/resume functionality

-- Add user_edited_at to insights table to track manual user edits
ALTER TABLE insights 
ADD COLUMN IF NOT EXISTS user_edited_at TIMESTAMPTZ;

-- Create index for efficient queries on user_edited_at
CREATE INDEX IF NOT EXISTS idx_insights_user_edited_at ON insights(user_edited_at);

-- Note: Session status tracking uses ended_at IS NULL for active sessions
-- No additional column needed for is_active

