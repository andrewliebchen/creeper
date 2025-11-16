import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  ListSessionsResponse,
  GetSessionResponse,
  UpdateDocumentRequest,
  UpdateDocumentResponse,
  ResumeSessionResponse,
} from '@creeper/shared';
import { supabase } from '../services/supabase.js';

const router = Router();

// Helper to get or create default user
async function getOrCreateDefaultUser(): Promise<string> {
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .limit(1)
    .single();

  if (existingUser) {
    return existingUser.id;
  }

  // Create default user
  const userId = uuidv4();
  const { error } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: null,
    });

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return userId;
}

// POST /sessions/create
router.post('/create', async (req, res) => {
  try {
    const { userId }: CreateSessionRequest = req.body;

    // Get or create user
    const finalUserId = userId || await getOrCreateDefaultUser();

    // Create new session
    const sessionId = uuidv4();
    const { error } = await supabase
      .from('meeting_sessions')
      .insert({
        id: sessionId,
        user_id: finalUserId,
        started_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    console.log(`\n🎙️  Created new meeting session: ${sessionId}`);

    const response: CreateSessionResponse = {
      sessionId,
    };

    res.json(response);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// GET /sessions - List all sessions for user
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;
    const finalUserId = userId || await getOrCreateDefaultUser();

    // Get all sessions for user
    const { data: sessions, error } = await supabase
      .from('meeting_sessions')
      .select('id, name, started_at, ended_at, updated_at')
      .eq('user_id', finalUserId)
      .order('started_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    // Get document previews for each session
    const sessionsWithPreviews = await Promise.all(
      (sessions || []).map(async (session) => {
        const { data: insight } = await supabase
          .from('insights')
          .select('content')
          .eq('session_id', session.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle() to handle no results gracefully

        const documentPreview = insight?.content
          ? insight.content.split('\n')[0].substring(0, 100)
          : undefined;

        return {
          id: session.id,
          name: session.name || undefined,
          startedAt: session.started_at,
          endedAt: session.ended_at || undefined,
          documentPreview,
          lastUpdated: session.updated_at,
          isActive: !session.ended_at,
        };
      })
    );

    const response: ListSessionsResponse = {
      sessions: sessionsWithPreviews,
    };

    res.json(response);
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// GET /sessions/:sessionId - Get full session with document
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('meeting_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found',
      });
    }

    // Get document (insight) for this session
    const { data: insight } = await supabase
      .from('insights')
      .select('*')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle() to handle no results gracefully

    const response: GetSessionResponse = {
      session: {
        id: session.id,
        userId: session.user_id,
        name: session.name || undefined,
        startedAt: session.started_at,
        endedAt: session.ended_at || undefined,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        isActive: !session.ended_at,
      },
      document: insight
        ? {
            id: insight.id,
            content: insight.content || insight.bullets?.join('\n') || '',
            bullets: insight.bullets || [],
            createdAt: insight.created_at,
            updatedAt: insight.updated_at,
            userEditedAt: insight.user_edited_at || undefined,
          }
        : null,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// POST /sessions/:sessionId/resume - Resume a session
router.post('/:sessionId/resume', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Clear ended_at to resume the session
    const { error } = await supabase
      .from('meeting_sessions')
      .update({
        ended_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to resume session: ${error.message}`);
    }

    console.log(`\n▶️  Resumed meeting session: ${sessionId}`);

    const response: ResumeSessionResponse = {
      status: 'ok',
      sessionId,
      message: 'Session resumed successfully',
    };

    res.json(response);
  } catch (error) {
    console.error('Error resuming session:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// PUT /sessions/:sessionId/document - Update document content (user edits)
router.put('/:sessionId/document', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content }: UpdateDocumentRequest = req.body;

    if (!content) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field: content',
      });
    }

    // Get existing insight for this session
    const { data: existingInsight } = await supabase
      .from('insights')
      .select('id')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle() to handle no results gracefully

    const now = new Date().toISOString();

    if (existingInsight) {
      // Update existing insight
      const { data: updatedInsight, error: updateError } = await supabase
        .from('insights')
        .update({
          content,
          user_edited_at: now,
          updated_at: now,
        })
        .eq('id', existingInsight.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update document: ${updateError.message}`);
      }

      const response: UpdateDocumentResponse = {
        status: 'ok',
        document: {
          id: updatedInsight.id,
          content: updatedInsight.content || '',
          updatedAt: updatedInsight.updated_at,
          userEditedAt: updatedInsight.user_edited_at || now,
        },
      };

      res.json(response);
    } else {
      // Create new insight if none exists
      const insightId = uuidv4();
      const { data: newInsight, error: insertError } = await supabase
        .from('insights')
        .insert({
          id: insightId,
          session_id: sessionId,
          content,
          bullets: [], // Empty bullets array, content is the source of truth
          user_edited_at: now,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create document: ${insertError.message}`);
      }

      const response: UpdateDocumentResponse = {
        status: 'ok',
        document: {
          id: newInsight.id,
          content: newInsight.content || '',
          updatedAt: newInsight.updated_at,
          userEditedAt: newInsight.user_edited_at || now,
        },
      };

      res.json(response);
    }
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// POST /sessions/:sessionId/end
router.post('/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { error } = await supabase
      .from('meeting_sessions')
      .update({
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to end session: ${error.message}`);
    }

    console.log(`\n🔚 Ended meeting session: ${sessionId}`);

    res.json({ status: 'ok', sessionId });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export { router as sessionsRouter };

