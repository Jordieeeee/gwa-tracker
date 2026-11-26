import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import RecordSummary from '../components/RecordSummary.jsx';
import { ErrorBox, Loading } from '../components/Status.jsx';
import { formatDate } from '../format.js';

export default function RecordPage() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  const load = useCallback(() => {
    setState({ status: 'loading' });
    api
      .getRecord(id)
      .then((record) => setState({ status: 'ready', record }))
      .catch((error) => setState({ status: 'error', error }));
  }, [id]);

  useEffect(load, [load]);

  if (state.status === 'loading') return <Loading label="Loading record…" />;

  if (state.status === 'error') {
    const missing = state.error.status === 404 || state.error.status === 400;
    return (
      <section className="space-y-4">
        {missing ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <h1 className="text-xl font-semibold">Record not found</h1>
            <p className="mt-1 text-slate-600">It may have been removed, or the link is wrong.</p>
          </div>
        ) : (
          <ErrorBox error={state.error} onRetry={load} />
        )}
        <Link to="/records" className="inline-block font-medium text-indigo-700 underline">
          Back to History
        </Link>
      </section>
    );
  }

  const { record } = state;
  return (
    <section aria-labelledby="record-heading" className="space-y-6">
      <Link to="/records" className="text-sm font-medium text-indigo-700 underline-offset-2 hover:underline">
        ← Back to History
      </Link>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 id="record-heading" className="text-xl font-semibold">
          {record.studentAlias}
        </h1>
        <p className="text-xs text-slate-500">Saved {formatDate(record.createdAt)}</p>
        <div className="mt-4">
          <RecordSummary record={record} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Subjects in this record</caption>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Subject</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Units</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {record.subjects.map((s) => (
              <tr key={s.code}>
                <td className="px-4 py-3 font-medium">{s.code}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.units}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
