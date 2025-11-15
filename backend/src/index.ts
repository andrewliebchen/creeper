import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables FIRST from project root, before importing any routes that use Supabase
// When running from backend/, go up one level to find .env
const envPath = resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });
// Also try current directory in case running from root
dotenv.config();

// Import routes after dotenv is loaded
import { healthRouter } from './routes/health.js';
import { ingestRouter } from './routes/ingest.js';
import { insightRouter } from './routes/insight.js';
import { documentsRouter } from './routes/documents.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', healthRouter);
app.use('/ingest', ingestRouter);
app.use('/insight', insightRouter);
app.use('/documents', documentsRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Creeper backend server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

