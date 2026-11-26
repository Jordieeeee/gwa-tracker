import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { recordInputSchema, formatIssues } from '../shared/recordSchema.js';
import { GRADE_MARKS } from '../shared/constants.js';

const valid = () => ({
  studentAlias: 'Juan',
  academicYear: '2026-2027',
  semester: '1ST',
  subjects: [{ code: 'it  412', units: 3, grade: 1 }],
});

const fieldsOf = (body) => {
  const r = recordInputSchema.safeParse(body);
  assert.equal(r.success, false, 'expected validation to fail');
  return formatIssues(r.error.issues).map((i) => i.field);
};

test('valid input is normalized', () => {
  const r = recordInputSchema.parse(valid());
  assert.equal(r.subjects[0].code, 'IT 412');
  assert.equal(r.subjects[0].grade, '1.00');
});

test('grade not in the allowed set is rejected', () => {
  for (const g of ['1.30', '4.00', 'A', 0, null]) {
    const b = valid();
    b.subjects[0].grade = g;
    assert.deepEqual(fieldsOf(b), ['subjects[0].grade']);
  }
});

test('units must be a whole number from 1 to 6', () => {
  for (const u of [0, -3, 7, 1.5, '3']) {
    const b = valid();
    b.subjects[0].units = u;
    assert.deepEqual(fieldsOf(b), ['subjects[0].units']);
  }
});

test('duplicate subject codes are rejected after normalizing', () => {
  const b = valid();
  b.subjects.push({ code: 'IT412', units: 3, grade: '2.00' });
  assert.deepEqual(fieldsOf(b), ['subjects[1].code']);
});

test('empty subject list and missing alias are rejected', () => {
  assert.ok(fieldsOf({ ...valid(), subjects: [] }).includes('subjects'));
  assert.ok(fieldsOf({ ...valid(), studentAlias: '  ' }).includes('studentAlias'));
});

test('student-number-like aliases are rejected', () => {
  for (const a of ['21-12345', 'Juan 2112345']) {
    assert.ok(fieldsOf({ ...valid(), studentAlias: a }).includes('studentAlias'));
  }
});

test('academic year must be consecutive years', () => {
  assert.ok(fieldsOf({ ...valid(), academicYear: '2026-2028' }).includes('academicYear'));
});

test('unknown fields are rejected', () => {
  assert.ok(fieldsOf({ ...valid(), gwa: 1 }).length > 0);
});

test('shared grade marks match the database seed', () => {
  const sql = fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
  const seeded = [...sql.matchAll(/^\s*\('([^']+)',\s*(?:NULL|\d)/gm)].map((m) => m[1]);
  assert.deepEqual(seeded, GRADE_MARKS);
});
