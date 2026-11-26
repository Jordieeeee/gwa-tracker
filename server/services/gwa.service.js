// Business logic. Pure functions: no database, no HTTP, so they are easy to test.
import { STANDINGS } from '../../shared/constants.js';

/**
 * @param {Array<{code:string, units:number, grade:string}>} subjects  validated input
 * @param {Map<string,{numericValue:number|null, countsInGwa:boolean, isDeficiency:boolean}>} gradeScale
 * @param {{deansList:{maxGwa:number, worstGradeAllowed:number, minUnits:number}, excludedFromGwaPrefixes:string[]}} rules
 * @returns {{totalUnits:number, gwaUnits:number, gwa:number|null, standing:string, reasons:string[]}}
 */
export function evaluate(subjects, gradeScale, rules) {
  const reasons = [];
  let totalUnits = 0;
  let gwaUnits = 0;
  let weightedHundredths = 0; // integer math: grade x 100 x units, no float drift
  let worstCounted = null;
  const deficiencies = [];

  for (const s of subjects) {
    const info = gradeScale.get(s.grade);
    if (!info) throw new Error(`Unknown grade mark: ${s.grade}`);
    totalUnits += s.units;

    if (info.isDeficiency) deficiencies.push(s);

    const excluded = rules.excludedFromGwaPrefixes.some((p) => s.code.startsWith(p));
    if (excluded) {
      reasons.push(`${s.code} is not counted in the GWA`);
      continue;
    }
    if (!info.countsInGwa) continue;

    const hundredths = Math.round(info.numericValue * 100);
    weightedHundredths += hundredths * s.units;
    gwaUnits += s.units;
    if (worstCounted === null || hundredths > worstCounted) worstCounted = hundredths;
  }

  // Round half up to 4 decimals: e.g. 1.23456 -> 1.2346
  const gwa = gwaUnits === 0 ? null : Math.round((weightedHundredths * 100) / gwaUnits) / 10000;

  for (const d of deficiencies) {
    reasons.push(`${d.grade} in ${d.code} disqualifies honors`);
  }

  let standing;
  if (gwa === null) {
    standing = STANDINGS.NOT_COMPUTABLE;
    reasons.unshift('No subject counts toward the GWA');
  } else if (deficiencies.length > 0) {
    standing = STANDINGS.HAS_DEFICIENCY;
  } else {
    const { maxGwa, worstGradeAllowed, minUnits } = rules.deansList;
    const misses = [];
    if (gwa > maxGwa) misses.push(`GWA ${gwa.toFixed(4)} is above the ${maxGwa.toFixed(2)} cutoff`);
    if (worstCounted > Math.round(worstGradeAllowed * 100)) {
      misses.push(`A grade is worse than ${worstGradeAllowed.toFixed(2)}`);
    }
    if (gwaUnits < minUnits) misses.push(`Only ${gwaUnits} units counted (minimum ${minUnits})`);

    if (misses.length === 0) {
      standing = STANDINGS.DEANS_LISTER;
      reasons.push(`GWA ${gwa.toFixed(4)} meets the ${maxGwa.toFixed(2)} cutoff with ${gwaUnits} units`);
    } else {
      standing = STANDINGS.GOOD_STANDING;
      reasons.push(...misses.map((m) => `Not Dean's List: ${m}`));
    }
  }

  return { totalUnits, gwaUnits, gwa, standing, reasons };
}
