import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import type { DocumentSearchRequest, DocumentSearchResponse } from '@creeper/shared';
import { supabase } from '../services/supabase.js';
import { generateEmbedding, storeDocumentChunkEmbedding } from '../services/embeddings.js';

const router = Router();

// Configure multer for document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/plain',
      'text/markdown',
      'text/md',
      'application/json',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only text files are allowed.'));
    }
  },
});

// Chunk text into smaller pieces for embedding
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap; // Overlap for context
  }

  return chunks;
}

// POST /documents/ingest
router.post('/ingest', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No document file provided',
      });
    }

    const { title } = req.body;
    const userId = req.headers['x-user-id'] as string || 'default-user';

    if (!title) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field: title',
      });
    }

    // Extract text from file
    const content = req.file.buffer.toString('utf-8');

    // Create document record
    const documentId = uuidv4();
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        user_id: userId,
        title,
        content,
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Failed to create document: ${docError.message}`);
    }

    // Chunk the document
    const chunks = chunkText(content);
    const chunkRecords = chunks.map((chunkContent, index) => ({
      id: uuidv4(),
      document_id: documentId,
      content: chunkContent,
      chunk_index: index,
    }));

    // Insert chunks
    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunkRecords);

    if (chunksError) {
      throw new Error(`Failed to create document chunks: ${chunksError.message}`);
    }

    // Generate embeddings for each chunk (async, don't block response)
    Promise.all(
      chunkRecords.map(async (chunk) => {
        try {
          const embedding = await generateEmbedding(chunk.content);
          await storeDocumentChunkEmbedding(chunk.id, embedding);
        } catch (error) {
          console.error(`Failed to generate embedding for chunk ${chunk.id}:`, error);
        }
      })
    ).catch(console.error);

    res.json({
      status: 'success',
      documentId,
      chunksCreated: chunks.length,
    });
  } catch (error) {
    console.error('Error ingesting document:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// POST /documents/search
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5, userId }: DocumentSearchRequest = req.body;

    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field: query',
      });
    }

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Vector similarity search using Supabase RPC function
    // Note: This requires a database function to be created (see migration)
    const { data: results, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: 0.7,
      match_count: limit,
      user_id_filter: userId || null,
    });

    if (error) {
      // Fallback to manual query if RPC function doesn't exist
      console.warn('RPC function not available, using fallback:', error);
      
      // Simple text search fallback
      const { data: fallbackResults } = await supabase
        .from('document_chunks')
        .select('id, content, document_id, documents(title)')
        .ilike('content', `%${query}%`)
        .limit(limit);

      const response: DocumentSearchResponse = {
        chunks: (fallbackResults || []).map((chunk: any) => ({
          id: chunk.id,
          documentId: chunk.document_id,
          content: chunk.content,
          similarity: 0.5, // Placeholder
          documentTitle: chunk.documents?.title || 'Unknown',
        })),
      };

      return res.json(response);
    }

    const response: DocumentSearchResponse = {
      chunks: (results || []).map((chunk: any) => ({
        id: chunk.id,
        documentId: chunk.document_id,
        content: chunk.content,
        similarity: chunk.similarity || 0,
        documentTitle: chunk.document_title || 'Unknown',
      })),
    };

    res.json(response);
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export { router as documentsRouter };

