-- GWA Tracker schema. Run once in the Supabase SQL Editor (safe to re-run).

-- 1. Lookup table: the only grade marks the system accepts.
--    PLACEHOLDER VALUES: confirm against the BatStateU student handbook.
CREATE TABLE IF NOT EXISTS grade_scale (
  mark           VARCHAR(4)   PRIMARY KEY,
  numeric_value  NUMERIC(3,2),                 -- NULL for INC / DRP
  counts_in_gwa  BOOLEAN      NOT NULL,
  is_deficiency  BOOLEAN      NOT NULL,
  sort_order     SMALLINT     NOT NULL UNIQUE,
  CHECK (counts_in_gwa = FALSE OR numeric_value IS NOT NULL)
);

INSERT INTO grade_scale (mark, numeric_value, counts_in_gwa, is_deficiency, sort_order) VALUES
  ('1.00', 1.00, TRUE,  FALSE,  1),
  ('1.25', 1.25, TRUE,  FALSE,  2),
  ('1.50', 1.50, TRUE,  FALSE,  3),
  ('1.75', 1.75, TRUE,  FALSE,  4),
  ('2.00', 2.00, TRUE,  FALSE,  5),
  ('2.25', 2.25, TRUE,  FALSE,  6),
  ('2.50', 2.50, TRUE,  FALSE,  7),
  ('2.75', 2.75, TRUE,  FALSE,  8),
  ('3.00', 3.00, TRUE,  FALSE,  9),
  ('5.00', 5.00, TRUE,  TRUE,  10),   -- PLACEHOLDER: does 5.00 count in GWA?
  ('INC',  NULL, FALSE, TRUE,  11),
  ('DRP',  NULL, FALSE, TRUE,  12)
ON CONFLICT (mark) DO NOTHING;

-- 2. One row per submitted semester. gwa / standing / reasons are a snapshot
--    computed by the server at write time and never updated.
CREATE TABLE IF NOT EXISTS records (
  id                BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_alias     VARCHAR(60)  NOT NULL CHECK (char_length(btrim(student_alias)) >= 2),
  academic_year     VARCHAR(9)   NOT NULL CHECK (academic_year ~ '^[0-9]{4}-[0-9]{4}$'),
  semester          VARCHAR(6)   NOT NULL CHECK (semester IN ('1ST', '2ND', 'SUMMER')),
  total_units       SMALLINT     NOT NULL CHECK (total_units > 0),
  gwa               NUMERIC(5,4) CHECK (gwa IS NULL OR gwa BETWEEN 1 AND 5),
  standing          VARCHAR(20)  NOT NULL CHECK (standing IN
                      ('DEANS_LISTER', 'GOOD_STANDING', 'HAS_DEFICIENCY', 'NOT_COMPUTABLE')),
  standing_reasons  TEXT[]       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3. Subjects of each record.
CREATE TABLE IF NOT EXISTS record_subjects (
  id            BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  record_id     BIGINT       NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  subject_code  VARCHAR(15)  NOT NULL,
  units         SMALLINT     NOT NULL CHECK (units BETWEEN 1 AND 6),
  grade_mark    VARCHAR(4)   NOT NULL REFERENCES grade_scale(mark),
  UNIQUE (record_id, subject_code)   -- also serves as the index on record_id
);

-- 4. Supabase exposes the public schema through its auto-generated REST API.
--    We only connect through Express (pg), so lock that API out: RLS on,
--    no policies = the anon/authenticated keys can read or write nothing.
--    The table owner (postgres, used by our server) is not affected.
ALTER TABLE grade_scale     ENABLE ROW LEVEL SECURITY;
ALTER TABLE records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_subjects ENABLE ROW LEVEL SECURITY;
