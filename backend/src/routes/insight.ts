import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { InsightRequest, InsightResponse } from '@creeper/shared';
import { openai } from '../services/openai.js';
import { supabase } from '../services/supabase.js';
import { generateEmbedding } from '../services/embeddings.js';

const router = Router();

/**
 * Generate or update session-level insights incrementally
 * Sends previous insight + new transcripts to LLM for incremental updates
 */
async function generateOrUpdateSessionInsight(
  sessionId: string,
  newTranscripts: string[]
): Promise<{ bullets: string[]; content: string; sessionName?: string }> {
  // Get existing insight for this session (if any)
  const { data: existingInsight } = await supabase
    .from('insights')
    .select('content, bullets, updated_at, user_edited_at')
    .eq('session_id', sessionId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle(); // Use maybeSingle() to handle no results gracefully

  // Check if user has edited the document since last LLM update
  const userEditedRecently = existingInsight?.user_edited_at && 
    existingInsight.user_edited_at > existingInsight.updated_at;

  // Get session to check if it already has a name
  const { data: session } = await supabase
    .from('meeting_sessions')
    .select('name')
    .eq('id', sessionId)
    .maybeSingle();

  const needsName = !session?.name;

  // Get all transcripts from this session
  const { data: snippets } = await supabase
    .from('meeting_snippets')
    .select('transcript, timestamp')
    .eq('session_id', sessionId)
    .not('transcript', 'is', null)
    .order('timestamp', { ascending: true });

  const allTranscripts = (snippets || [])
    .map((s: any) => s.transcript)
    .filter((t: string) => t && t.trim().length > 0);

  if (allTranscripts.length === 0) {
    throw new Error('No transcripts available for this session');
  }

  // Get relevant documents via RAG (use combined transcripts)
  let ragContext = '';
  try {
    const combinedText = allTranscripts.join('\n\n');
    const queryEmbedding = await generateEmbedding(combinedText);
    
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

  // Build prompt for incremental insight updates
  const previousInsight = existingInsight?.content || existingInsight?.bullets?.join('\n') || '';
  const newTranscriptsText = newTranscripts.join('\n\n');
  const allTranscriptsText = allTranscripts.join('\n\n');

  let prompt: string;
  
  if (userEditedRecently && previousInsight) {
    // User has edited the document - merge their edits with new information
    prompt = `You are a real-time meeting assistant maintaining an evolving insight document for this meeting session.

IMPORTANT: The user has manually edited this document. You must preserve their edits and structure while incorporating new information.

CURRENT USER-EDITED DOCUMENT:
${previousInsight}

NEW TRANSCRIPTS (since last update):
${newTranscriptsText}

FULL MEETING TRANSCRIPT (for context):
${allTranscriptsText}
${ragContext}

Update the document by:
1. Preserving the user's structure, formatting, and key points they wrote
2. Adding new insights, facts, and next steps from the new transcripts
3. Merging related information rather than duplicating
4. Keeping it organized and actionable

Do NOT overwrite or remove user edits. Integrate new information while respecting their work.`;
  } else if (previousInsight) {
    // Standard update - no recent user edits
    prompt = `You are a real-time meeting assistant maintaining an evolving insight document for this meeting session.

PREVIOUS INSIGHT DOCUMENT:
${previousInsight}

NEW TRANSCRIPTS (since last update):
${newTranscriptsText}

FULL MEETING TRANSCRIPT (for context):
${allTranscriptsText}
${ragContext}

Update the insight document to incorporate the new information. Keep it concise, actionable, and focused on what helps right now. Do not just summarize - provide insights that evolve as the meeting progresses.`;
  } else {
    // Initial document creation
    prompt = `You are a real-time meeting assistant. Create an initial insight document for this meeting session.

MEETING TRANSCRIPT:
${allTranscriptsText}
${ragContext}

Create a living document that will evolve throughout the meeting. Include:
- Key notes and facts
- Impressions and insights
- Relevant context from documents (if provided)
- Next steps and action items

This document will be updated incrementally as more transcripts come in. Make it organized and useful.`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful meeting assistant maintaining a living document workspace. The document evolves throughout the meeting, incorporating notes, impressions, facts, insights, and next steps. When the user has edited the document, always preserve their edits and merge new information intelligently.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500, // Increased for full living document
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse bullet points from response (for display)
    const bullets = responseText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)))
      .map((line) => line.replace(/^[-•]\s*|\d+\.\s*/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 3);

    // Use full response as content, or bullets if no bullets found
    const content = bullets.length > 0 ? responseText.trim() : responseText.trim();
    const finalBullets = bullets.length > 0 ? bullets : [responseText.trim()];

    // Generate session name if needed (only on first insight generation)
    let sessionName: string | undefined;
    if (needsName && allTranscripts.length > 0) {
      try {
        const nameCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates concise, descriptive names for meeting sessions based on their content.',
            },
            {
              role: 'user',
              content: `Based on this meeting transcript, generate a short, descriptive name (2-6 words) for this session:\n\n${allTranscripts.slice(0, 3).join('\n\n')}\n\nReturn only the name, nothing else.`,
            },
          ],
          max_tokens: 20,
          temperature: 0.7,
        });

        sessionName = nameCompletion.choices[0]?.message?.content?.trim();
        // Clean up the name (remove quotes, extra whitespace)
        if (sessionName) {
          sessionName = sessionName.replace(/^["']|["']$/g, '').trim();
        }
      } catch (error) {
        console.warn('Failed to generate session name:', error);
        // Continue without name - not critical
      }
    }

    return { bullets: finalBullets, content, sessionName };
  } catch (error) {
    console.error('OpenAI insight generation error:', error);
    throw new Error(
      `Failed to generate insights: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Shared handler for session-based insights
async function handleSessionInsightRequest(sessionId: string): Promise<InsightResponse> {
  // Get new transcripts (those without insights yet, or all if no insight exists)
  const { data: existingInsight } = await supabase
    .from('insights')
    .select('updated_at')
    .eq('session_id', sessionId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle(); // Use maybeSingle() to handle no results gracefully

    // Get snippets that were created after the last insight update (or all if no insight)
    const lastUpdateTime = existingInsight?.updated_at;
    let snippetsQuery = supabase
      .from('meeting_snippets')
      .select('transcript, timestamp, id, session_id')
      .eq('session_id', sessionId)
      .not('transcript', 'is', null);

    if (lastUpdateTime) {
      snippetsQuery = snippetsQuery.gt('updated_at', lastUpdateTime);
    }

    const { data: newSnippets, error: snippetsError } = await snippetsQuery.order('timestamp', { ascending: true });
    
    if (snippetsError) {
      console.error('Error querying snippets:', snippetsError);
      throw new Error(`Failed to query snippets: ${snippetsError.message}`);
    }
    
    console.log(`   Found ${newSnippets?.length || 0} snippets with transcripts for session ${sessionId}`);

    const newTranscripts = (newSnippets || [])
      .map((s: any) => s.transcript)
      .filter((t: string) => t && t.trim().length > 0);

    // Check if there are ANY transcripts in the session (not just new ones)
    const { data: allSnippets, error: allSnippetsError } = await supabase
      .from('meeting_snippets')
      .select('transcript, session_id')
      .eq('session_id', sessionId)
      .not('transcript', 'is', null);

    if (allSnippetsError) {
      console.error('Error querying all snippets:', allSnippetsError);
      throw new Error(`Failed to query all snippets: ${allSnippetsError.message}`);
    }

    const allTranscripts = (allSnippets || [])
      .map((s: any) => s.transcript)
      .filter((t: string) => t && t.trim().length > 0);
    
    console.log(`   Total transcripts in session: ${allTranscripts.length}`);

    // If no transcripts exist yet, return early (waiting for transcription)
    if (allTranscripts.length === 0) {
      if (existingInsight) {
        // Return existing insight even if no transcripts currently
        const { data: currentInsight } = await supabase
          .from('insights')
          .select('*')
          .eq('session_id', sessionId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (currentInsight) {
          return {
            insight: {
              id: currentInsight.id,
              sessionId: currentInsight.session_id,
              bullets: currentInsight.bullets || [],
              content: currentInsight.content || currentInsight.bullets?.join('\n') || '',
              createdAt: currentInsight.created_at,
              updatedAt: currentInsight.updated_at,
            },
          };
        }
      }
      // No transcripts and no insight - return a special response indicating we're waiting
      // This is not an error, just a "not ready yet" state
      const waitingError: any = new Error('No transcripts available yet. Waiting for transcription...');
      waitingError.statusCode = 202; // Accepted - processing not complete
      waitingError.isWaiting = true;
      throw waitingError;
    }

    // If no new transcripts but we have an existing insight, return it (no need to regenerate)
    if (newTranscripts.length === 0 && existingInsight) {
      const { data: currentInsight } = await supabase
        .from('insights')
        .select('*')
        .eq('session_id', sessionId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (currentInsight) {
        // Silently return existing insight (no log needed - nothing changed)
        return {
          insight: {
            id: currentInsight.id,
            sessionId: currentInsight.session_id,
            bullets: currentInsight.bullets || [],
            content: currentInsight.content || currentInsight.bullets?.join('\n') || '',
            createdAt: currentInsight.created_at,
            updatedAt: currentInsight.updated_at,
          },
        };
      }
    }

    // Generate or update insight (we know transcripts exist at this point)
    console.log(`\n💡 ${existingInsight ? 'Updating' : 'Generating'} insights for session ${sessionId}...`);
    console.log(`   New transcripts: ${newTranscripts.length}`);
    
    let bullets: string[];
    let content: string;
    
    let sessionName: string | undefined;
    
    try {
      const result = await generateOrUpdateSessionInsight(sessionId, newTranscripts);
      bullets = result.bullets;
      content = result.content;
      sessionName = result.sessionName;
      
      console.log(`✓ ${existingInsight ? 'Updated' : 'Generated'} insights:`);
      bullets.forEach((bullet, idx) => {
        console.log(`   ${idx + 1}. ${bullet}`);
      });
      
      // Update session name if generated
      if (sessionName) {
        const { error: nameError } = await supabase
          .from('meeting_sessions')
          .update({ name: sessionName })
          .eq('id', sessionId);
        
        if (nameError) {
          console.warn('Failed to update session name:', nameError);
        } else {
          console.log(`✓ Updated session name: "${sessionName}"`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to generate/update insights:`, error);
      throw error; // Re-throw to be caught by the route handler
    }

    // Upsert insight in database (update if exists, insert if not)
    if (existingInsight) {
      const { error: updateError } = await supabase
        .from('insights')
        .update({
          bullets,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId);

      if (updateError) {
        console.error('Failed to update insight:', updateError);
      } else {
        console.log(`✓ Updated insight for session ${sessionId}`);
      }

      const { data: updatedInsight } = await supabase
        .from('insights')
        .select('*')
        .eq('session_id', sessionId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!updatedInsight) {
        throw new Error('Failed to retrieve updated insight');
      }

      return {
        insight: {
          id: updatedInsight.id,
          sessionId: updatedInsight.session_id,
          bullets: updatedInsight.bullets || [],
          content: updatedInsight.content || '',
          createdAt: updatedInsight.created_at,
          updatedAt: updatedInsight.updated_at,
        },
      };
    } else {
      // Create new insight
      const insightId = uuidv4();
      const { error: insertError } = await supabase
        .from('insights')
        .insert({
          id: insightId,
          session_id: sessionId,
          snippet_id: null, // Session-based insights don't have a specific snippet_id
          bullets,
          content,
        });

      if (insertError) {
        console.error('Failed to store insight:', insertError);
        throw new Error(`Failed to store insight: ${insertError.message}`);
      } else {
        console.log(`✓ Stored insight ${insightId} for session ${sessionId}`);
      }

      const { data: newInsight } = await supabase
        .from('insights')
        .select('*')
        .eq('id', insightId)
        .maybeSingle();

      if (!newInsight) {
        throw new Error('Failed to retrieve newly created insight');
      }

      return {
        insight: {
          id: newInsight.id,
          sessionId: newInsight.session_id,
          bullets: newInsight.bullets || [],
          content: newInsight.content || '',
          createdAt: newInsight.created_at,
          updatedAt: newInsight.updated_at,
        },
      };
    }
}

// POST /insight/for-session (new session-based endpoint)
router.post('/for-session', async (req, res) => {
  try {
    const { sessionId }: InsightRequest = req.body;

    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field: sessionId',
      });
    }

    console.log(`\n📊 Insight request for session: ${sessionId}`);
    const result = await handleSessionInsightRequest(sessionId);
    console.log(`✓ Returning insight for session ${sessionId}`);
    res.json(result);
  } catch (error: any) {
    // Handle "waiting for transcripts" as a 202 (Accepted) response, not an error
    if (error.isWaiting || error.message?.includes('No transcripts available yet')) {
      console.log(`⏳ No transcripts yet for session, returning 202 (waiting)`);
      return res.status(202).json({
        status: 'waiting',
        message: 'No transcripts available yet. Waiting for transcription...',
      });
    }
    
    console.error(`❌ Error in /insight/for-session:`, error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// POST /insight/for-chunk (kept for backward compatibility, but deprecated)
router.post('/for-chunk', async (req, res) => {
  try {
    const { snippetId, sessionId, transcript }: InsightRequest = req.body;

    // If sessionId is provided, use session-based endpoint
    if (sessionId) {
      const result = await handleSessionInsightRequest(sessionId);
      return res.json(result);
    }

    // Legacy per-snippet behavior (deprecated)
    if (!snippetId) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field: snippetId or sessionId',
      });
    }

    // Get snippet to find session
    const { data: snippet } = await supabase
      .from('meeting_snippets')
      .select('session_id, transcript')
      .eq('id', snippetId)
      .maybeSingle();

    if (snippet?.session_id) {
      // Use session-based approach
      const result = await handleSessionInsightRequest(snippet.session_id);
      return res.json(result);
    }

    // Fallback to old behavior if no session
    return res.status(400).json({
      status: 'error',
      message: 'Snippet is not associated with a session. Please use session-based insights.',
    });
  } catch (error) {
    console.error('Error in legacy insight endpoint:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export { router as insightRouter };
