import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { recordInputSchema, formatIssues } from '../../shared/recordSchema.js';
import { evaluate } from '../services/gwa.service.js';
import { STANDING_RULES } from '../config/standing.js';
import { HttpError } from '../middleware/errors.js';

export function createApiRouter(repo, { postLimit = 20 } = {}) {
  const router = Router();

  // Spam protection for the only write endpoint (per IP, per 15 minutes).
  const postLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: postLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many submissions. Try again later.' } }),
  });

  // Render health check + keep-alive target. Touches the DB so Supabase sees activity.
  router.get('/health', async (req, res, next) => {
    try {
      await repo.ping();
      res.status(200).json({ status: 'ok', database: 'up' });
    } catch (err) {
      next(err);
    }
  });

  router.get('/grade-scale', async (req, res, next) => {
    try {
      res.status(200).json({ data: await repo.getGradeScale() });
    } catch (err) {
      next(err);
    }
  });

  router.get('/records', async (req, res, next) => {
    try {
      res.status(200).json({ data: await repo.listRecords(50) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/records/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!/^[1-9]\d{0,14}$/.test(id)) {
        throw new HttpError(400, 'INVALID_ID', 'Record id must be a positive whole number');
      }
      const record = await repo.getRecordById(Number(id));
      if (!record) throw new HttpError(404, 'NOT_FOUND', `Record ${id} does not exist`);
      res.status(200).json({ data: record });
    } catch (err) {
      next(err);
    }
  });

  router.post('/records', postLimiter, async (req, res, next) => {
    try {
      if (!req.is('application/json')) {
        throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send the body as JSON (Content-Type: application/json)');
      }
      const parsed = recordInputSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid input', formatIssues(parsed.error.issues));
      }
      const input = parsed.data;
      const gradeScale = await repo.getGradeScaleMap();
      const result = evaluate(input.subjects, gradeScale, STANDING_RULES);
      const saved = await repo.createRecord(input, result);
      res.status(201).location(`/api/records/${saved.id}`).json({ data: saved });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
