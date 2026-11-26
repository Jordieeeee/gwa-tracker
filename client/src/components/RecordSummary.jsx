import StandingBadge from './StandingBadge.jsx';
import { formatGwa, formatTerm } from '../format.js';

// GWA, standing and reasons. Used on the Compute result and the Detail page.
export default function RecordSummary({ record }) {
  return (
    <div>
      <p className="text-sm text-slate-600">{formatTerm(record.academicYear, record.semester)}</p>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p className="text-sm text-slate-600">GWA</p>
          <p className="text-4xl font-semibold tabular-nums text-slate-900">{formatGwa(record.gwa)}</p>
        </div>
        <div className="pb-1">
          <StandingBadge standing={record.standing} />
        </div>
        <p className="pb-1 text-sm text-slate-600">{record.totalUnits} total units</p>
      </div>
      {record.reasons?.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {record.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
