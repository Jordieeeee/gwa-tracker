import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api.js';
import { recordInputSchema, formatIssues } from '../../../shared/recordSchema.js';
import { GRADE_MARKS, SEMESTERS, SEMESTER_LABELS, LIMITS } from '../../../shared/constants.js';
import { currentAcademicYear } from '../format.js';
import RecordSummary from '../components/RecordSummary.jsx';
import { ColdStartNote, useSlow } from '../components/Status.jsx';

const inputBase =
  'block w-full rounded-md border bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600';
const inputClass = (hasError) => `${inputBase} ${hasError ? 'border-red-500' : 'border-slate-300'}`;

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-700">
      {message}
    </p>
  );
}

export default function ComputePage() {
  const nextId = useRef(2);
  const summaryRef = useRef(null);
  const [alias, setAlias] = useState('');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [semester, setSemester] = useState('1ST');
  const [rows, setRows] = useState([{ id: 1, code: '', units: '3', grade: '' }]);
  // Shared list first so the form works instantly; replaced by the DB copy once loaded.
  const [gradeOptions, setGradeOptions] = useState(GRADE_MARKS);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const slow = useSlow(submitting);

  useEffect(() => {
    api.gradeScale().then((scale) => setGradeOptions(scale.map((g) => g.mark))).catch(() => {});
  }, []);

  const updateRow = (id, field, value) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };
  const addRow = () => {
    setRows((rs) => [...rs, { id: nextId.current++, code: '', units: '3', grade: '' }]);
    setErrors({});
  };
  const removeRow = (id) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
    setErrors({}); // row indexes shift, so old messages would point at the wrong row
  };

  const showErrors = (details) => {
    const map = {};
    for (const d of details) {
      if (map[d.field]) continue;
      // The API lists every allowed mark (useful in Postman); the form only needs a short hint.
      map[d.field] = d.field.endsWith('.grade') ? 'Select a grade from the list' : d.message;
    }
    setErrors(map);
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    const body = {
      studentAlias: alias,
      academicYear,
      semester,
      subjects: rows.map((r) => ({ code: r.code, units: r.units === '' ? NaN : Number(r.units), grade: r.grade })),
    };

    // Same rules as the server, for instant feedback. The server still re-checks everything.
    const check = recordInputSchema.safeParse(body);
    if (!check.success) {
      showErrors(formatIssues(check.error.issues));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      setResult(await api.createRecord(body));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.details?.length) showErrors(err.details);
      else setSubmitError(err);
    } finally {
      setSubmitting(false);
    }
  }

  function startOver() {
    setResult(null);
    setRows([{ id: nextId.current++, code: '', units: '3', grade: '' }]);
    setErrors({});
  }

  if (result) {
    return (
      <section aria-labelledby="result-heading" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 id="result-heading" className="text-xl font-semibold">
          Result for {result.studentAlias}
        </h1>
        <div className="mt-4">
          <RecordSummary record={result} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={startOver} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Compute another
          </button>
          <Link to={`/records/${result.id}`} className="rounded-md px-4 py-2 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50">
            View saved record
          </Link>
        </div>
      </section>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <section aria-labelledby="compute-heading">
      <h1 id="compute-heading" className="text-2xl font-semibold">
        Compute your GWA
      </h1>
      <p className="mt-1 text-slate-600">Enter one semester. The server computes your GWA and standing, then saves it.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div ref={summaryRef} tabIndex={-1} aria-live="assertive" className="empty:hidden">
          {errorCount > 0 && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              Fix {errorCount === 1 ? '1 field' : `${errorCount} fields`} below before submitting.
              {errors['(body)'] && <span className="block">{errors['(body)']}</span>}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label htmlFor="alias" className="block text-sm font-medium text-slate-700">
              Nickname
            </label>
            <input
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={LIMITS.aliasMax}
              autoComplete="off"
              aria-invalid={!!errors.studentAlias}
              aria-describedby="alias-hint alias-error"
              className={`mt-1 ${inputClass(errors.studentAlias)}`}
            />
            <p id="alias-hint" className="mt-1 text-xs text-slate-500">
              Records are public. Use a nickname, not your real name or student number.
            </p>
            <FieldError id="alias-error" message={errors.studentAlias} />
          </div>
          <div>
            <label htmlFor="ay" className="block text-sm font-medium text-slate-700">
              Academic year
            </label>
            <input
              id="ay"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2026-2027"
              inputMode="numeric"
              aria-invalid={!!errors.academicYear}
              aria-describedby="ay-error"
              className={`mt-1 ${inputClass(errors.academicYear)}`}
            />
            <FieldError id="ay-error" message={errors.academicYear} />
          </div>
          <div>
            <label htmlFor="sem" className="block text-sm font-medium text-slate-700">
              Semester
            </label>
            <select id="sem" value={semester} onChange={(e) => setSemester(e.target.value)} className={`mt-1 ${inputClass(errors.semester)}`}>
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>
                  {SEMESTER_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Subjects</legend>
          {errors.subjects && <FieldError id="subjects-error" message={errors.subjects} />}
          <div className="mt-2 hidden grid-cols-[1fr_6rem_8rem_2.5rem] gap-3 text-xs font-medium text-slate-500 sm:grid" aria-hidden="true">
            <span>Subject code</span>
            <span>Units</span>
            <span>Grade</span>
            <span />
          </div>
          <ol className="mt-2 space-y-3">
            {rows.map((row, i) => {
              const n = i + 1;
              const e = {
                code: errors[`subjects[${i}].code`],
                units: errors[`subjects[${i}].units`],
                grade: errors[`subjects[${i}].grade`],
              };
              return (
                <li key={row.id} className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_6rem_8rem_2.5rem] sm:border-0 sm:p-0">
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor={`code-${row.id}`} className="text-xs text-slate-600 sm:sr-only">
                      Subject {n} code
                    </label>
                    <input
                      id={`code-${row.id}`}
                      value={row.code}
                      onChange={(ev) => updateRow(row.id, 'code', ev.target.value)}
                      placeholder="IT 412"
                      maxLength={LIMITS.codeMax}
                      autoComplete="off"
                      aria-invalid={!!e.code}
                      aria-describedby={`code-${row.id}-error`}
                      className={inputClass(e.code)}
                    />
                    <FieldError id={`code-${row.id}-error`} message={e.code} />
                  </div>
                  <div>
                    <label htmlFor={`units-${row.id}`} className="text-xs text-slate-600 sm:sr-only">
                      Subject {n} units
                    </label>
                    <input
                      id={`units-${row.id}`}
                      type="number"
                      min={LIMITS.unitsMin}
                      max={LIMITS.unitsMax}
                      step="1"
                      value={row.units}
                      onChange={(ev) => updateRow(row.id, 'units', ev.target.value)}
                      aria-invalid={!!e.units}
                      aria-describedby={`units-${row.id}-error`}
                      className={inputClass(e.units)}
                    />
                    <FieldError id={`units-${row.id}-error`} message={e.units} />
                  </div>
                  <div>
                    <label htmlFor={`grade-${row.id}`} className="text-xs text-slate-600 sm:sr-only">
                      Subject {n} grade
                    </label>
                    <select
                      id={`grade-${row.id}`}
                      value={row.grade}
                      onChange={(ev) => updateRow(row.id, 'grade', ev.target.value)}
                      aria-invalid={!!e.grade}
                      aria-describedby={`grade-${row.id}-error`}
                      className={inputClass(e.grade)}
                    >
                      <option value="">Select</option>
                      {gradeOptions.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <FieldError id={`grade-${row.id}-error`} message={e.grade} />
                  </div>
                  <div className="col-span-2 flex items-start sm:col-span-1">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      aria-label={`Remove subject ${n}`}
                      className="rounded-md px-2 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span aria-hidden="true">✕</span>
                      <span className="ml-1 sm:hidden">Remove</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={addRow}
            disabled={rows.length >= LIMITS.subjectsMax}
            className="mt-3 rounded-md px-3 py-2 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add subject
          </button>
          {rows.length >= LIMITS.subjectsMax && <p className="mt-1 text-xs text-slate-500">Maximum of {LIMITS.subjectsMax} subjects.</p>}
        </fieldset>

        {submitError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {submitError.message}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
          >
            {submitting ? 'Computing…' : 'Compute and save'}
          </button>
          {slow && <ColdStartNote />}
        </div>
      </form>
    </section>
  );
}
