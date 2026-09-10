import express from 'express';
import { apiRouter } from '../src/services/api/routes';

const app = express();

app.use(express.json());

// Handle URL rewriting or normalization from Vercel edge/rewrites
app.use((req, res, next) => {
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path']) as string | undefined;
  if (matchedPath && (req.url === '/' || req.url === '/api' || req.url === '/api/')) {
    req.url = matchedPath;
  }
  next();
});

// Mount apiRouter on both '/api' and '/'
// This ensures that whether Vercel preserves the '/api' prefix or strips it,
// the routes (/anime/trending, /manga/popular, etc.) match correctly.
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Fallback for unmatched API routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint ${req.originalUrl || req.url} not found`,
  });
});

export default app;
