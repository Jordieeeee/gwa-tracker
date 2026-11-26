import { useEffect, useState } from 'react';

// True once `active` has stayed true for `ms`. Used to explain cold starts.
export function useSlow(active, ms = 4000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return undefined;
    }
    const t = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(t);
  }, [active, ms]);
  return slow;
}

export function Loading({ label = 'Loading…' }) {
  const slow = useSlow(true);
  return (
    <div role="status" aria-live="polite" className="py-10 text-center text-slate-600">
      <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" aria-hidden="true" />
      <p>{label}</p>
      {slow && <ColdStartNote />}
    </div>
  );
}

export function ColdStartNote() {
  return (
    <p className="mt-2 text-sm text-slate-500">
      Waking up the server. The first request after a quiet period can take up to a minute.
    </p>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
      <p className="font-medium">{error.message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-red-800 ring-1 ring-red-300 hover:bg-red-100">
          Try again
        </button>
      )}
    </div>
  );
}
