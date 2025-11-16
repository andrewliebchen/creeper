import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { CreateSessionRequest, CreateSessionResponse } from '@creeper/shared';
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

