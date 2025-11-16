import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { MeetingSnippet } from '@creeper/shared';

// Lazy initialization - client is created on first access
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables. Make sure .env file is configured with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }

    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

// Export a proxy that lazily initializes the client
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = client[prop as keyof SupabaseClient];
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

export interface CreateSnippetParams {
  id: string;
  userId: string;
  sessionId?: string;
  timestamp: number;
  duration: number;
}

export async function createSnippet(params: CreateSnippetParams): Promise<MeetingSnippet> {
  const { data, error } = await supabase
    .from('meeting_snippets')
    .insert({
      id: params.id,
      user_id: params.userId,
      session_id: params.sessionId || null,
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
    sessionId: data.session_id || undefined,
    timestamp: data.timestamp,
    duration: data.duration,
    transcript: data.transcript || undefined,
    transcriptId: data.transcript_id || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

