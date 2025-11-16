import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import type { IngestAudioChunkResponse } from '@creeper/shared';
import { createSnippet, supabase } from '../services/supabase.js';
import { transcribeAudio, updateSnippetTranscript } from '../services/openai.js';
import { generateEmbedding, storeSnippetEmbedding } from '../services/embeddings.js';

const router = Router();

// Configure multer for temporary file storage
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory, not disk
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    const allowedMimes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/m4a',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

// Process transcription asynchronously
async function processTranscription(
  snippetId: string,
  audioBuffer: Buffer,
  format: string
): Promise<void> {
  console.log(`\n🔄 Starting transcription for snippet ${snippetId}...`);
  try {
    // Transcribe audio
    const filename = `audio.${format}`;
    const result = await transcribeAudio(audioBuffer, filename);

    // Update snippet with transcript
    await updateSnippetTranscript(snippetId, result.text);

    console.log(`\n📝 Transcription complete:`);
    console.log(`   Snippet ID: ${snippetId}`);
    console.log(`   Transcript: ${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}`);

    // Generate and store embedding
    const embedding = await generateEmbedding(result.text);
    await storeSnippetEmbedding(snippetId, embedding);
    console.log(`✓ Generated and stored embedding for snippet ${snippetId}`);

    // Trigger insight generation (async, don't wait)
    // This will be called by the frontend when needed, or can be triggered here
    // For now, we'll let the frontend request insights on demand
  } catch (error) {
    console.error(`Failed to process transcription for snippet ${snippetId}:`, error);
    throw error;
  }
}

// POST /ingest/audio-chunk
router.post('/audio-chunk', upload.single('audio'), async (req, res) => {
  console.log(`\n📥 Incoming request to /ingest/audio-chunk`);
  console.log(`   Has file: ${!!req.file}`);
  console.log(`   Body keys: ${Object.keys(req.body).join(', ')}`);
  
  try {
    if (!req.file) {
      console.error('❌ No audio file in request');
      return res.status(400).json({
        status: 'error',
        message: 'No audio file provided',
      });
    }

    const { timestamp, duration, format, sessionId } = req.body;
    // Get sessionId from body or header
    const finalSessionId = sessionId || (req.headers['x-session-id'] as string);
    console.log(`   Session ID: ${finalSessionId || 'NOT PROVIDED'}`);
    // Get or create default user (UUID required for database)
    let userId = req.headers['x-user-id'] as string;
    if (!userId) {
      // Try to get existing user, or create a default one
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (existingUsers && existingUsers.length > 0) {
        userId = existingUsers[0].id;
      } else {
        // Create default user
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({})
          .select('id')
          .single();
        
        if (userError || !newUser) {
          throw new Error(`Failed to create default user: ${userError?.message || 'Unknown error'}`);
        }
        userId = newUser.id;
        console.log(`✓ Created default user: ${userId}`);
      }
    }

    if (!timestamp || !duration) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: timestamp, duration',
      });
    }

    // Create snippet record in database (metadata only, no audio storage)
    const snippetId = uuidv4();
    const snippet = await createSnippet({
      id: snippetId,
      userId,
      sessionId: finalSessionId || undefined,
      timestamp: parseInt(timestamp, 10),
      duration: parseInt(duration, 10),
    });

    // Audio file is in req.file.buffer (in-memory)
    // We'll process it for transcription in the next step
    // For now, we just store the metadata

    const response: IngestAudioChunkResponse = {
      snippetId,
      status: 'received',
    };

    console.log(`\n🎤 Audio chunk received:`);
    console.log(`   Snippet ID: ${snippetId}`);
    console.log(`   Session ID: ${finalSessionId || 'NOT PROVIDED'}`);
    console.log(`   Size: ${req.file.size} bytes`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Timestamp: ${new Date(parseInt(timestamp, 10)).toISOString()}`);

    res.json(response);

    // Trigger transcription pipeline asynchronously
    // Process transcription in background (don't block response)
    processTranscription(snippetId, req.file.buffer, format || 'webm').catch((error) => {
      console.error(`❌ Failed to transcribe snippet ${snippetId}:`, error);
    });
  } catch (error) {
    console.error('Error ingesting audio chunk:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export { router as ingestRouter };
