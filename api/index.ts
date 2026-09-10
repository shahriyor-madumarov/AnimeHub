import express, { Request, Response, NextFunction } from 'express';
import { apiRouter } from '../src/services/api/routes';

const app = express();

// Disable x-powered-by header
app.disable('x-powered-by');

// Parse JSON bodies safely
app.use(express.json());

// Handle URL rewriting or normalization from Vercel edge/rewrites
app.use((req: Request, res: Response, next: NextFunction) => {
  const matchedPath = (
    req.headers['x-matched-path'] ||
    req.headers['x-vercel-matched-path'] ||
    req.headers['x-forwarded-url']
  ) as string | undefined;

  // If Vercel rewrote the URL to /api or / or /api/, restore the matched path
  if (matchedPath && (req.url === '/' || req.url === '/api' || req.url === '/api/')) {
    req.url = matchedPath;
  } else if (req.originalUrl && (req.url === '/' || req.url === '/api' || req.url === '/api/')) {
    if (req.originalUrl.startsWith('/api')) {
      req.url = req.originalUrl;
    }
  }
  next();
});

// Mount apiRouter on both '/api' and '/'
// This guarantees that whether Vercel preserves or strips the '/api' prefix,
// all routes (/anime/trending, /manga/popular, /news/latest, etc.) match correctly.
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Fallback for unmatched API routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint ${req.originalUrl || req.url} not found`,
  });
});

// Global error handler to prevent unhandled exceptions from crashing the serverless container
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Serverless Error]', err);
  if (!res.headersSent) {
    res.status(err?.status || 500).json({
      error: 'Internal Server Error',
      message: err?.message || 'An unexpected error occurred',
    });
  }
});

// Standard exports for Vercel Node.js Serverless Functions
export const handler = (req: Request, res: Response) => app(req, res);
export { app };
export default app;
