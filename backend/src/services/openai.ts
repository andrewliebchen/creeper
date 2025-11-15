import OpenAI from 'openai';
import type { MeetingSnippet } from '@creeper/shared';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranscriptionResult {
  text: string;
  language?: string;
}

/**
 * Transcribe audio using OpenAI Speech-to-Text API
 * @param audioBuffer - Audio file buffer
 * @param filename - Optional filename for the audio file
 * @returns Transcription result with text and language
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = 'audio.webm'
): Promise<TranscriptionResult> {
  try {
    // Create a File-like object from the buffer
    const file = new File([audioBuffer], filename, {
      type: 'audio/webm',
    });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en', // Optional: specify language for better accuracy
      response_format: 'verbose_json', // Get additional metadata
    });

    return {
      text: transcription.text,
      language: transcription.language || undefined,
    };
  } catch (error) {
    console.error('OpenAI transcription error:', error);
    throw new Error(
      `Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update snippet with transcript in Supabase
 */
export async function updateSnippetTranscript(
  snippetId: string,
  transcript: string
): Promise<void> {
  const { supabase } = await import('./supabase.js');
  
  const { error } = await supabase
    .from('meeting_snippets')
    .update({
      transcript,
      updated_at: new Date().toISOString(),
    })
    .eq('id', snippetId);

  if (error) {
    throw new Error(`Failed to update snippet transcript: ${error.message}`);
  }
}

