import { openai } from './openai.js';
import { supabase } from './supabase.js';

/**
 * Generate embedding for text using OpenAI
 * @param text - Text to generate embedding for
 * @returns Embedding vector (1536 dimensions for text-embedding-3-small)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Store embedding for a meeting snippet
 */
export async function storeSnippetEmbedding(
  snippetId: string,
  embedding: number[]
): Promise<void> {
  const { error } = await supabase
    .from('meeting_snippets')
    .update({
      embedding: `[${embedding.join(',')}]`, // Convert array to PostgreSQL array format
      updated_at: new Date().toISOString(),
    })
    .eq('id', snippetId);

  if (error) {
    throw new Error(`Failed to store snippet embedding: ${error.message}`);
  }
}

/**
 * Store embedding for a document chunk
 */
export async function storeDocumentChunkEmbedding(
  chunkId: string,
  embedding: number[]
): Promise<void> {
  // Convert array to PostgreSQL vector format
  const embeddingStr = `[${embedding.join(',')}]`;
  
  const { error } = await supabase
    .from('document_chunks')
    .update({
      embedding: embeddingStr,
    })
    .eq('id', chunkId);

  if (error) {
    throw new Error(`Failed to store document chunk embedding: ${error.message}`);
  }
}

