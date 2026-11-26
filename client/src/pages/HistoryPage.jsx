import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import StandingBadge from '../components/StandingBadge.jsx';
import { ErrorBox, Loading } from '../components/Status.jsx';
import { formatDate, formatGwa, formatTerm } from '../format.js';

export default function HistoryPage() {
  const [state, setState] = useState({ status: 'loading' });

  const load = useCallback(() => {
    setState({ status: 'loading' });
    api
      .listRecords()
      .then((records) => setState({ status: 'ready', records }))
      .catch((error) => setState({ status: 'error', error }));
  }, []);

  useEffect(load, [load]);

  return (
    <section aria-labelledby="history-heading">
      <h1 id="history-heading" className="text-2xl font-semibold">
        History
      </h1>
      <p className="mt-1 text-slate-600">The 50 most recent records.</p>

      <div className="mt-6">
        {state.status === 'loading' && <Loading label="Loading records…" />}
        {state.status === 'error' && <ErrorBox error={state.error} onRetry={load} />}
        {state.status === 'ready' && state.records.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-slate-700">No records yet.</p>
            <Link to="/" className="mt-3 inline-block font-medium text-indigo-700 underline">
              Compute your first GWA
            </Link>
          </div>
        )}
        {state.status === 'ready' && state.records.length > 0 && (
          <>
            {/* Table on larger screens */}
            <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Nickname</th>
                    <th scope="col" className="px-4 py-3 font-medium">Term</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Units</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">GWA</th>
                    <th scope="col" className="px-4 py-3 font-medium">Standing</th>
                    <th scope="col" className="px-4 py-3 font-medium">Saved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link to={`/records/${r.id}`} className="font-medium text-indigo-700 underline-offset-2 hover:underline">
                          {r.studentAlias}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatTerm(r.academicYear, r.semester)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.totalUnits}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{formatGwa(r.gwa)}</td>
                      <td className="px-4 py-3">
                        <StandingBadge standing={r.standing} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards on phones */}
            <ul className="space-y-3 sm:hidden">
              {state.records.map((r) => (
                <li key={r.id}>
                  <Link to={`/records/${r.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-900">{r.studentAlias}</span>
                      <span className="text-lg font-semibold tabular-nums">{formatGwa(r.gwa)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{formatTerm(r.academicYear, r.semester)}</p>
                    <div className="mt-2">
                      <StandingBadge standing={r.standing} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
