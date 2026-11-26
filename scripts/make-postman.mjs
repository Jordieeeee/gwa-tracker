// Generates postman/gwa-tracker.postman_collection.json
// Run: node scripts/make-postman.mjs
import fs from 'node:fs';

const valid = {
  studentAlias: 'Postman Demo',
  academicYear: '2026-2027',
  semester: '1ST',
  subjects: [
    { code: 'IT 412', units: 3, grade: '1.25' },
    { code: 'IT 413', units: 3, grade: '1.50' },
    { code: 'NSTP 1', units: 3, grade: '1.00' },
  ],
};
const mutate = (fn) => {
  const b = structuredClone(valid);
  fn(b);
  return b;
};

const expect = (code, extra = '') => [
  `pm.test('Status is ${code}', () => pm.response.to.have.status(${code}));`,
  ...(extra ? [extra] : []),
];
const errorField = (field) =>
  `pm.test('Error names ${field}', () => pm.expect(pm.response.json().error.details.map(d => d.field)).to.include('${field}'));`;

const req = (name, method, path, { body, raw, contentType = 'application/json', tests }) => ({
  name,
  event: [{ listen: 'test', script: { type: 'text/javascript', exec: tests } }],
  request: {
    method,
    header: body !== undefined || raw !== undefined ? [{ key: 'Content-Type', value: contentType }] : [],
    url: { raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: path.split('/').filter(Boolean) },
    ...(body !== undefined || raw !== undefined
      ? { body: { mode: 'raw', raw: raw ?? JSON.stringify(body, null, 2) } }
      : {}),
  },
});

const collection = {
  info: {
    name: 'GWA Tracker API (IT 412)',
    description: 'Run in order. Set baseUrl to your Render URL. Screenshot each response for Part 4.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'https://YOUR-APP.onrender.com' },
    { key: 'recordId', value: '' },
  ],
  item: [
    req('GET health (200)', 'GET', '/api/health', { tests: expect(200) }),
    req('GET grade scale (200)', 'GET', '/api/grade-scale', { tests: expect(200) }),
    req('POST record, valid (201)', 'POST', '/api/records', {
      body: valid,
      tests: expect(
        201,
        "pm.collectionVariables.set('recordId', pm.response.json().data.id);\npm.test('GWA computed by server', () => pm.expect(pm.response.json().data.gwa).to.be.a('number'));",
      ),
    }),
    req('GET all records (200)', 'GET', '/api/records', { tests: expect(200) }),
    req('GET one record (200)', 'GET', '/api/records/{{recordId}}', { tests: expect(200) }),
    req('POST invalid grade 4.00 (400)', 'POST', '/api/records', {
      body: mutate((b) => (b.subjects[0].grade = '4.00')),
      tests: expect(400, errorField('subjects[0].grade')),
    }),
    req('POST units = 0 (400)', 'POST', '/api/records', {
      body: mutate((b) => (b.subjects[0].units = 0)),
      tests: expect(400, errorField('subjects[0].units')),
    }),
    req('POST duplicate subject code (400)', 'POST', '/api/records', {
      body: mutate((b) => (b.subjects[1].code = 'it412')),
      tests: expect(400, errorField('subjects[1].code')),
    }),
    req('POST empty subjects (400)', 'POST', '/api/records', {
      body: mutate((b) => (b.subjects = [])),
      tests: expect(400, errorField('subjects')),
    }),
    req('POST missing nickname (400)', 'POST', '/api/records', {
      body: mutate((b) => delete b.studentAlias),
      tests: expect(400, errorField('studentAlias')),
    }),
    req('POST malformed JSON (400)', 'POST', '/api/records', {
      raw: '{ "studentAlias": "Broken", ',
      tests: expect(400),
    }),
    req('POST wrong content type (415)', 'POST', '/api/records', {
      raw: 'studentAlias=Juan',
      contentType: 'text/plain',
      tests: expect(415),
    }),
    req('GET record not found (404)', 'GET', '/api/records/999999999', { tests: expect(404) }),
    req('GET record bad id (400)', 'GET', '/api/records/abc', { tests: expect(400) }),
  ],
};

fs.mkdirSync('postman', { recursive: true });
fs.writeFileSync('postman/gwa-tracker.postman_collection.json', `${JSON.stringify(collection, null, 2)}\n`);
console.log(`Wrote ${collection.item.length} requests`);
