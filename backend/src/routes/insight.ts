import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { InsightRequest, InsightResponse } from '@creeper/shared';
import { openai } from '../services/openai.js';
import { supabase } from '../services/supabase.js';
import { generateEmbedding } from '../services/embeddings.js';

const router = Router();

/**
 * Generate insights for a meeting snippet
 * Uses OpenAI chat completion with RAG context
 */
async function generateInsight(snippetId: string, transcript: string): Promise<string[]> {
  // Get relevant documents via RAG (if available)
  let ragContext = '';
  try {
    const queryEmbedding = await generateEmbedding(transcript);
    
    // Vector similarity search in Supabase
    const { data: relevantChunks, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: 0.7,
      match_count: 3,
    });

    if (!error && relevantChunks && relevantChunks.length > 0) {
      ragContext = '\n\nRelevant context from your documents:\n' +
        relevantChunks.map((chunk: any) => `- ${chunk.content}`).join('\n');
    }
  } catch (error) {
    console.warn('RAG search failed, continuing without context:', error);
  }

  // Build prompt for real-time insights
  const prompt = `You are a real-time meeting assistant. Provide 1-3 helpful bullet points based on this transcript. Do not summarize. Focus on what helps right now.

Transcript:
${transcript}
${ragContext}

Provide 1-3 actionable insights as bullet points:`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for faster, cheaper responses
      messages: [
        {
          role: 'system',
          content: 'You are a helpful meeting assistant. Provide concise, actionable insights.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse bullet points from response
    const bullets = responseText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)))
      .map((line) => line.replace(/^[-•]\s*|\d+\.\s*/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 3); // Max 3 bullets

    return bullets.length > 0 ? bullets : [responseText.trim()];
  } catch (error) {
    console.error('OpenAI insight generation error:', error);
    throw new Error(
      `Failed to generate insights: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// POST /insight/for-chunk
router.post('/for-chunk', async (req, res) => {
  try {
    const { snippetId, transcript }: InsightRequest = req.body;

    if (!snippetId) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field: snippetId',
      });
    }

    // Get transcript from database if not provided
    let finalTranscript = transcript;
    if (!finalTranscript) {
      const { data: snippet, error } = await supabase
        .from('meeting_snippets')
        .select('transcript')
        .eq('id', snippetId)
        .single();

      if (error || !snippet?.transcript) {
        return res.status(404).json({
          status: 'error',
          message: 'Snippet not found or has no transcript',
        });
      }

      finalTranscript = snippet.transcript;
    }

    // Generate insights
    console.log(`\n💡 Generating insights for snippet ${snippetId}...`);
    const bullets = await generateInsight(snippetId, finalTranscript);
    console.log(`✓ Generated ${bullets.length} insights:`);
    bullets.forEach((bullet, idx) => {
      console.log(`   ${idx + 1}. ${bullet}`);
    });

    // Store insight in database
    const insightId = uuidv4();
    const { error: insertError } = await supabase
      .from('insights')
      .insert({
        id: insightId,
        snippet_id: snippetId,
        bullets,
        context: null, // TODO: Store RAG context if needed
      });

    if (insertError) {
      console.error('Failed to store insight:', insertError);
      // Continue anyway, return the insight
    } else {
      console.log(`✓ Stored insight ${insightId} in database`);
    }

    const response: InsightResponse = {
      insight: {
        id: insightId,
        snippetId,
        bullets,
        createdAt: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating insight:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export { router as insightRouter };

