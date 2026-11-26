import { SEMESTER_LABELS } from '../../shared/constants.js';

export const formatGwa = (gwa) => (gwa === null || gwa === undefined ? '—' : gwa.toFixed(4));

export const formatTerm = (academicYear, semester) => `${SEMESTER_LABELS[semester] ?? semester}, AY ${academicYear}`;

export const formatDate = (iso) =>
  new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' });

// AY starts in August: Nov 2026 -> "2026-2027", Mar 2027 -> "2026-2027".
export function currentAcademicYear(now = new Date()) {
  const y = now.getFullYear();
  return now.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}
