import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../server/services/gwa.service.js';

// Mirrors db/schema.sql
const scale = new Map(
  [
    ['1.00', 1.0], ['1.25', 1.25], ['1.50', 1.5], ['1.75', 1.75], ['2.00', 2.0], ['2.25', 2.25],
    ['2.50', 2.5], ['2.75', 2.75], ['3.00', 3.0],
  ].map(([mark, v]) => [mark, { numericValue: v, countsInGwa: true, isDeficiency: false }]),
);
scale.set('5.00', { numericValue: 5, countsInGwa: true, isDeficiency: true });
scale.set('INC', { numericValue: null, countsInGwa: false, isDeficiency: true });
scale.set('DRP', { numericValue: null, countsInGwa: false, isDeficiency: true });

const rules = { deansList: { maxGwa: 1.75, worstGradeAllowed: 2.5, minUnits: 15 }, excludedFromGwaPrefixes: ['NSTP'] };
const sub = (code, units, grade) => ({ code, units, grade });

test('weighted GWA uses units as weights', () => {
  const r = evaluate([sub('IT 411', 3, '1.00'), sub('IT 412', 1, '2.00')], scale, rules);
  assert.equal(r.gwa, 1.25); // (3*1 + 1*2) / 4
  assert.equal(r.totalUnits, 4);
});

test('rounds to 4 decimals without float drift', () => {
  const r = evaluate([sub('A1', 3, '1.25'), sub('B1', 3, '1.50'), sub('C1', 1, '2.75')], scale, rules);
  // (3.75 + 4.5 + 2.75) / 7 = 1.571428... -> 1.5714
  assert.equal(r.gwa, 1.5714);
});

test("Dean's Lister when every rule passes", () => {
  const subjects = [1, 2, 3, 4, 5].map((n) => sub(`IT 40${n}`, 3, '1.50'));
  const r = evaluate(subjects, scale, rules);
  assert.equal(r.standing, 'DEANS_LISTER');
  assert.equal(r.gwa, 1.5);
});

test('good GWA but too few units is Good Standing, with the reason', () => {
  const r = evaluate([sub('IT 401', 3, '1.00')], scale, rules);
  assert.equal(r.standing, 'GOOD_STANDING');
  assert.ok(r.reasons.some((x) => x.includes('Only 3 units')));
});

test('one grade worse than the allowed grade blocks Dean\'s List', () => {
  const subjects = [1, 2, 3, 4].map((n) => sub(`IT 40${n}`, 3, '1.00'));
  subjects.push(sub('IT 405', 3, '2.75'));
  const r = evaluate(subjects, scale, rules);
  assert.equal(r.standing, 'GOOD_STANDING');
  assert.ok(r.reasons.some((x) => x.includes('worse than 2.50')));
});

test('5.00 counts in GWA and is a deficiency', () => {
  const r = evaluate([sub('IT 401', 3, '1.00'), sub('IT 402', 3, '5.00')], scale, rules);
  assert.equal(r.gwa, 3);
  assert.equal(r.standing, 'HAS_DEFICIENCY');
  assert.ok(r.reasons.includes('5.00 in IT 402 disqualifies honors'));
});

test('INC is excluded from GWA but is a deficiency', () => {
  const r = evaluate([sub('IT 401', 3, '1.00'), sub('IT 412', 3, 'INC')], scale, rules);
  assert.equal(r.gwa, 1);
  assert.equal(r.totalUnits, 6);
  assert.equal(r.gwaUnits, 3);
  assert.equal(r.standing, 'HAS_DEFICIENCY');
});

test('all INC/DRP is Not Computable with a null GWA', () => {
  const r = evaluate([sub('IT 401', 3, 'INC'), sub('IT 402', 3, 'DRP')], scale, rules);
  assert.equal(r.gwa, null);
  assert.equal(r.standing, 'NOT_COMPUTABLE');
});

test('NSTP is saved but excluded from GWA', () => {
  const r = evaluate([sub('IT 401', 3, '1.00'), sub('NSTP 1', 3, '3.00')], scale, rules);
  assert.equal(r.gwa, 1);
  assert.equal(r.totalUnits, 6);
});

test('unknown mark throws (defensive: validation should stop it first)', () => {
  assert.throws(() => evaluate([sub('IT 401', 3, '4.00')], scale, rules));
});
