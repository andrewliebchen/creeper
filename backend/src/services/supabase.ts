import { createClient } from '@supabase/supabase-js';
import type { MeetingSnippet } from '@creeper/shared';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export interface CreateSnippetParams {
  id: string;
  userId: string;
  timestamp: number;
  duration: number;
}

export async function createSnippet(params: CreateSnippetParams): Promise<MeetingSnippet> {
  const { data, error } = await supabase
    .from('meeting_snippets')
    .insert({
      id: params.id,
      user_id: params.userId,
      timestamp: params.timestamp,
      duration: params.duration,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create snippet: ${error.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    timestamp: data.timestamp,
    duration: data.duration,
    transcript: data.transcript || undefined,
    transcriptId: data.transcript_id || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

