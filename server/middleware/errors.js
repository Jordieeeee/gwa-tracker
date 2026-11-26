// Every error leaves the API in one shape:
// { "error": { "code": "...", "message": "...", "details": [...] } }

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Errors that mean "the database is unreachable or waking up", not "your input is bad".
const DB_UNAVAILABLE = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN',
  '57P01', '57P03', '08000', '08001', '08003', '08006', 'XX000',
]);

export function notFoundApi(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    const body = { code: err.code, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json({ error: body });
  }
  // Thrown by express.json() for a body that is not valid JSON.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large (max 10kb)' } });
  }
  const isDbDown =
    DB_UNAVAILABLE.has(err.code) || /timeout|terminat|connect/i.test(err.message || '');
  console.error('[api]', req.method, req.originalUrl, err);
  if (isDbDown) {
    return res.status(503).json({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is unavailable or waking up. Try again in a moment.' },
    });
  }
  // Never send stack traces or SQL errors to the client.
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side' } });
}
