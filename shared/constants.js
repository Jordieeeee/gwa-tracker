// Shared by the React client and the Express server.
// The database table `grade_scale` holds the same marks; the API serves the
// dropdown from the database, and this list is the validation rule.
// If you change one, change db/schema.sql too (a test checks they match).

export const GRADE_MARKS = [
  '1.00', '1.25', '1.50', '1.75', '2.00', '2.25',
  '2.50', '2.75', '3.00', '5.00', 'INC', 'DRP',
];

export const SEMESTERS = ['1ST', '2ND', 'SUMMER'];

export const SEMESTER_LABELS = {
  '1ST': '1st Semester',
  '2ND': '2nd Semester',
  SUMMER: 'Summer',
};

export const STANDINGS = {
  DEANS_LISTER: 'DEANS_LISTER',
  GOOD_STANDING: 'GOOD_STANDING',
  HAS_DEFICIENCY: 'HAS_DEFICIENCY',
  NOT_COMPUTABLE: 'NOT_COMPUTABLE',
};

export const STANDING_LABELS = {
  DEANS_LISTER: "Dean's Lister",
  GOOD_STANDING: 'Good Standing',
  HAS_DEFICIENCY: 'Has Deficiency',
  NOT_COMPUTABLE: 'Not Computable',
};

export const LIMITS = {
  aliasMin: 2,
  aliasMax: 60,
  subjectsMin: 1,
  subjectsMax: 15,
  unitsMin: 1,
  unitsMax: 6,
  codeMax: 15,
};
