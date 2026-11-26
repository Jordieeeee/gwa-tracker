// One validation schema, used by the form (client) and the API (server).
// The server is the authority: the client copy only gives faster feedback.
import { z } from 'zod';
import { GRADE_MARKS, SEMESTERS, LIMITS } from './constants.js';

// "1", 1, "1.0", " 1.00 " -> "1.00"; "inc" -> "INC". Anything else passes
// through unchanged and is rejected by the enum check.
export function normalizeGrade(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value.toFixed(2);
  if (typeof value !== 'string') return value;
  const v = value.trim().toUpperCase();
  if (/^\d+(\.\d+)?$/.test(v)) return Number(v).toFixed(2);
  return v;
}

// "it  412" -> "IT 412"
export function normalizeCode(value) {
  if (typeof value !== 'string') return value;
  return value.trim().toUpperCase().replace(/\s+/g, ' ');
}

const collapse = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v);

const subjectSchema = z.object({
  code: z.preprocess(
    normalizeCode,
    z
      .string({ error: 'Subject code is required' })
      .min(2, 'Subject code must be at least 2 characters')
      .max(LIMITS.codeMax, `Subject code must be at most ${LIMITS.codeMax} characters`)
      .regex(/^[A-Z0-9][A-Z0-9 -]*$/, 'Use letters, numbers, spaces or dashes only'),
  ),
  units: z
    .number({ error: 'Units must be a number' })
    .int('Units must be a whole number')
    .min(LIMITS.unitsMin, `Units must be ${LIMITS.unitsMin} to ${LIMITS.unitsMax}`)
    .max(LIMITS.unitsMax, `Units must be ${LIMITS.unitsMin} to ${LIMITS.unitsMax}`),
  grade: z.preprocess(
    normalizeGrade,
    z.enum(GRADE_MARKS, { error: `Grade must be one of ${GRADE_MARKS.join(', ')}` }),
  ),
});

export const recordInputSchema = z
  .object({
    studentAlias: z.preprocess(
      collapse,
      z
        .string({ error: 'Nickname is required' })
        .min(LIMITS.aliasMin, `Nickname must be at least ${LIMITS.aliasMin} characters`)
        .max(LIMITS.aliasMax, `Nickname must be at most ${LIMITS.aliasMax} characters`)
        // Privacy guard: block anything that looks like a student number.
        .refine((v) => !/\d{2}-\d{4,}/.test(v) && !/\d{5,}/.test(v), {
          message: 'Do not use student numbers in the nickname',
        }),
    ),
    academicYear: z
      .string({ error: 'Academic year is required' })
      .trim()
      .regex(/^\d{4}-\d{4}$/, 'Academic year must look like 2026-2027')
      .refine((v) => Number(v.slice(5)) === Number(v.slice(0, 4)) + 1, {
        message: 'Second year must be the first year + 1',
      }),
    semester: z.enum(SEMESTERS, { error: `Semester must be one of ${SEMESTERS.join(', ')}` }),
    subjects: z
      .array(subjectSchema, { error: 'Subjects must be a list' })
      .min(LIMITS.subjectsMin, 'Add at least one subject')
      .max(LIMITS.subjectsMax, `At most ${LIMITS.subjectsMax} subjects per record`),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Map();
    data.subjects.forEach((s, i) => {
      const key = s.code.replace(/[\s-]/g, '');
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['subjects', i, 'code'],
          message: `Duplicate subject code (same as row ${seen.get(key) + 1})`,
        });
      } else {
        seen.set(key, i);
      }
    });
  });

// zod issues -> [{ field: "subjects[2].grade", message }]
export function formatIssues(issues) {
  return issues.map((issue) => ({
    field: issue.path.reduce(
      (acc, part) => (typeof part === 'number' ? `${acc}[${part}]` : acc ? `${acc}.${part}` : String(part)),
      '',
    ) || '(body)',
    message: issue.message,
  }));
}
