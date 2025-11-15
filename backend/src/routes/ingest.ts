import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import type { IngestAudioChunkResponse } from '@creeper/shared';
import { createSnippet } from '../services/supabase.js';
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
  try {
    // Transcribe audio
    const filename = `audio.${format}`;
    const result = await transcribeAudio(audioBuffer, filename);

    // Update snippet with transcript
    await updateSnippetTranscript(snippetId, result.text);

    console.log(`✓ Transcribed snippet ${snippetId}: ${result.text.substring(0, 50)}...`);

    // Generate and store embedding
    const embedding = await generateEmbedding(result.text);
    await storeSnippetEmbedding(snippetId, embedding);
    console.log(`✓ Generated embedding for snippet ${snippetId}`);

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
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No audio file provided',
      });
    }

    const { timestamp, duration, format } = req.body;
    const userId = req.headers['x-user-id'] as string || 'default-user'; // TODO: proper auth

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

    res.json(response);

    // Trigger transcription pipeline asynchronously
    // Process transcription in background (don't block response)
    processTranscription(snippetId, req.file.buffer, format || 'webm').catch((error) => {
      console.error(`Failed to transcribe snippet ${snippetId}:`, error);
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
