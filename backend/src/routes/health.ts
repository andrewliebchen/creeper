import { Router } from 'express';
import type { HealthResponse } from '@creeper/shared';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'ok', // Will be checked in later chunks
      openai: 'ok', // Will be checked in later chunks
    },
  };

  res.json(response);
});

