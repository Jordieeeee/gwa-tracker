// API tests against a REAL Postgres database (local or a Supabase test project).
// Run: npm run test:api   (needs DATABASE_URL in .env, schema.sql already applied)
// Warning: inserts test rows into the database you point it at.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { createPool } from '../server/db/pool.js';
import { createRecordsRepo } from '../server/repositories/records.repo.js';

let pool, server, base, limitedServer, limitedBase;

const listen = (app) =>
  new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

before(async () => {
  pool = createPool();
  const repo = createRecordsRepo(pool);
  server = await listen(createApp(repo));
  base = `http://127.0.0.1:${server.address().port}/api`;
  limitedServer = await listen(createApp(repo, { postLimit: 1 }));
  limitedBase = `http://127.0.0.1:${limitedServer.address().port}/api`;
});

after(async () => {
  server.close();
  limitedServer.close();
  await pool.end();
});

const post = (body, headers = { 'Content-Type': 'application/json' }, url = `${base}/records`) =>
  fetch(url, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });

const validBody = () => ({
  studentAlias: 'Test Student',
  academicYear: '2026-2027',
  semester: '1ST',
  subjects: [
    { code: 'IT 412', units: 3, grade: '1.25' },
    { code: 'IT 413', units: 3, grade: '1.50' },
  ],
});

test('GET /health -> 200', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok', database: 'up' });
});

test('GET /grade-scale -> 200 with 12 marks from the DB', async () => {
  const res = await fetch(`${base}/grade-scale`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.length, 12);
});

let createdId;
test('POST /records valid -> 201 with computed GWA, saved to DB', async () => {
  const res = await post(validBody());
  assert.equal(res.status, 201);
  const { data } = await res.json();
  assert.equal(data.gwa, 1.375);
  assert.equal(data.standing, 'GOOD_STANDING'); // only 6 units < placeholder minimum
  assert.equal(res.headers.get('location'), `/api/records/${data.id}`);
  createdId = data.id;

  const { rows } = await pool.query('SELECT count(*)::int AS n FROM record_subjects WHERE record_id = $1', [createdId]);
  assert.equal(rows[0].n, 2);
});

test('GET /records -> 200 and includes the new record', async () => {
  const res = await fetch(`${base}/records`);
  assert.equal(res.status, 200);
  assert.ok((await res.json()).data.some((r) => r.id === createdId));
});

test('GET /records/:id -> 200 with subjects and reasons', async () => {
  const res = await fetch(`${base}/records/${createdId}`);
  assert.equal(res.status, 200);
  const { data } = await res.json();
  assert.equal(data.subjects.length, 2);
  assert.ok(Array.isArray(data.reasons) && data.reasons.length > 0);
});

test('GET /records/:id unknown -> 404, non-numeric -> 400', async () => {
  assert.equal((await fetch(`${base}/records/999999999`)).status, 404);
  assert.equal((await fetch(`${base}/records/abc`)).status, 400);
  assert.equal((await fetch(`${base}/records/1;DROP TABLE records`)).status, 400);
});

test('POST invalid grade / units / duplicate / empty -> 400 with field details', async () => {
  const cases = [
    [(b) => (b.subjects[0].grade = '4.00'), 'subjects[0].grade'],
    [(b) => (b.subjects[0].units = 0), 'subjects[0].units'],
    [(b) => (b.subjects[1].code = 'it412'), 'subjects[1].code'],
    [(b) => (b.subjects = []), 'subjects'],
    [(b) => delete b.studentAlias, 'studentAlias'],
  ];
  for (const [mutate, field] of cases) {
    const body = validBody();
    mutate(body);
    const res = await post(body);
    assert.equal(res.status, 400, `expected 400 for ${field}`);
    const json = await res.json();
    assert.equal(json.error.code, 'VALIDATION_ERROR');
    assert.ok(json.error.details.some((d) => d.field === field), `missing detail for ${field}`);
  }
});

test('POST malformed JSON -> 400, wrong content type -> 415, huge body -> 413', async () => {
  assert.equal((await post('{"studentAlias": ')).status, 400);
  assert.equal((await post('hello', { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post(JSON.stringify({ x: 'a'.repeat(20_000) }))).status, 413);
});

test('failed validation saves nothing', async () => {
  const before = (await pool.query('SELECT count(*)::int AS n FROM records')).rows[0].n;
  const body = validBody();
  body.subjects[0].grade = 'A+';
  await post(body);
  const afterCount = (await pool.query('SELECT count(*)::int AS n FROM records')).rows[0].n;
  assert.equal(afterCount, before);
});

test('XSS and SQL-looking input is stored as plain text', async () => {
  const body = validBody();
  body.studentAlias = `<script>alert(1)</script>'; DROP TABLE records;--`;
  const res = await post(body);
  assert.equal(res.status, 201);
  const { data } = await res.json();
  const got = await (await fetch(`${base}/records/${data.id}`)).json();
  assert.equal(got.data.studentAlias, body.studentAlias);
  assert.equal((await fetch(`${base}/records`)).status, 200); // table still exists
});

test('unknown API route -> 404 JSON', async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'NOT_FOUND');
});

test('rate limit -> 429 after the limit', async () => {
  assert.equal((await post(validBody(), undefined, `${limitedBase}/records`)).status, 201);
  assert.equal((await post(validBody(), undefined, `${limitedBase}/records`)).status, 429);
});

test('security headers are set', async () => {
  const res = await fetch(`${base}/health`);
  assert.ok(res.headers.get('content-security-policy'));
  assert.equal(res.headers.get('x-powered-by'), null);
});
