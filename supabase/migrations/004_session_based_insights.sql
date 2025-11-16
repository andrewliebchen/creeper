-- Migration 004: Session-based insights
-- Changes insights from per-snippet to per-session, allowing incremental updates

-- Create meeting_sessions table
CREATE TABLE IF NOT EXISTS meeting_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add session_id to meeting_snippets
ALTER TABLE meeting_snippets 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES meeting_sessions(id) ON DELETE SET NULL;

-- Update insights table to reference session instead of snippet
-- First, make snippet_id nullable (since insights are now session-based)
ALTER TABLE insights 
ALTER COLUMN snippet_id DROP NOT NULL;

-- Add session_id column
ALTER TABLE insights 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES meeting_sessions(id) ON DELETE CASCADE;

-- Make insights updatable (add updated_at)
ALTER TABLE insights 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Change bullets to be a single TEXT field for the full insight document
-- We'll keep bullets as array for now but add content field for the full insight
ALTER TABLE insights 
ADD COLUMN IF NOT EXISTS content TEXT; -- Full insight document that gets updated

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_user_id ON meeting_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_started_at ON meeting_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_snippets_session_id ON meeting_snippets(session_id);
CREATE INDEX IF NOT EXISTS idx_insights_session_id ON insights(session_id);

-- Trigger for insights updated_at
CREATE TRIGGER update_insights_updated_at BEFORE UPDATE ON insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for meeting_sessions updated_at
CREATE TRIGGER update_meeting_sessions_updated_at BEFORE UPDATE ON meeting_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

