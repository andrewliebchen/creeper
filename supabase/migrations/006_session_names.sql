-- Migration 006: Add session name field
-- Allows LLM to generate descriptive names for sessions

-- Add name column to meeting_sessions table
ALTER TABLE meeting_sessions 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Create index for efficient name searches (optional, but useful if we add search later)
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_name ON meeting_sessions(name);

