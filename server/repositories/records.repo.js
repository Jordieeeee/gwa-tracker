// All SQL lives here. Every query is parameterized ($1, $2, ...): no string building.

const toRecordSummary = (r) => ({
  id: r.id,
  studentAlias: r.student_alias,
  academicYear: r.academic_year,
  semester: r.semester,
  totalUnits: r.total_units,
  gwa: r.gwa === null ? null : Number(r.gwa),
  standing: r.standing,
  createdAt: r.created_at,
});

export function createRecordsRepo(pool) {
  let gradeScaleCache = null;

  return {
    async ping() {
      await pool.query('SELECT 1');
    },

    async getGradeScale() {
      const { rows } = await pool.query(
        `SELECT mark, numeric_value, counts_in_gwa, is_deficiency
           FROM grade_scale ORDER BY sort_order`,
      );
      return rows.map((r) => ({
        mark: r.mark,
        numericValue: r.numeric_value === null ? null : Number(r.numeric_value),
        countsInGwa: r.counts_in_gwa,
        isDeficiency: r.is_deficiency,
      }));
    },

    // Cached as a Map for the GWA service; the scale is seeded once and does not change.
    async getGradeScaleMap() {
      if (!gradeScaleCache) {
        const scale = await this.getGradeScale();
        gradeScaleCache = new Map(scale.map((g) => [g.mark, g]));
      }
      return gradeScaleCache;
    },

    async listRecords(limit = 50) {
      const { rows } = await pool.query(
        `SELECT id, student_alias, academic_year, semester, total_units, gwa, standing, created_at
           FROM records ORDER BY created_at DESC, id DESC LIMIT $1`,
        [limit],
      );
      return rows.map(toRecordSummary);
    },

    async getRecordById(id) {
      const { rows } = await pool.query(
        `SELECT id, student_alias, academic_year, semester, total_units, gwa, standing,
                standing_reasons, created_at
           FROM records WHERE id = $1`,
        [id],
      );
      if (rows.length === 0) return null;
      const subjects = await pool.query(
        `SELECT subject_code, units, grade_mark
           FROM record_subjects WHERE record_id = $1 ORDER BY id`,
        [id],
      );
      return {
        ...toRecordSummary(rows[0]),
        reasons: rows[0].standing_reasons,
        subjects: subjects.rows.map((s) => ({ code: s.subject_code, units: s.units, grade: s.grade_mark })),
      };
    },

    // Record + all subjects in ONE transaction: either everything is saved or nothing is.
    async createRecord(input, result) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `INSERT INTO records
             (student_alias, academic_year, semester, total_units, gwa, standing, standing_reasons)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, student_alias, academic_year, semester, total_units, gwa, standing,
                     standing_reasons, created_at`,
          [
            input.studentAlias,
            input.academicYear,
            input.semester,
            result.totalUnits,
            result.gwa,
            result.standing,
            result.reasons,
          ],
        );
        const record = rows[0];
        for (const s of input.subjects) {
          await client.query(
            `INSERT INTO record_subjects (record_id, subject_code, units, grade_mark)
             VALUES ($1, $2, $3, $4)`,
            [record.id, s.code, s.units, s.grade],
          );
        }
        await client.query('COMMIT');
        return {
          ...toRecordSummary(record),
          reasons: record.standing_reasons,
          subjects: input.subjects.map((s) => ({ code: s.code, units: s.units, grade: s.grade })),
        };
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
  };
}
