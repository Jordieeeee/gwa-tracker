import { STANDING_LABELS } from '../../../shared/constants.js';

const STYLES = {
  DEANS_LISTER: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  GOOD_STANDING: 'bg-sky-50 text-sky-800 ring-sky-200',
  HAS_DEFICIENCY: 'bg-amber-50 text-amber-900 ring-amber-300',
  NOT_COMPUTABLE: 'bg-slate-100 text-slate-700 ring-slate-300',
};

// The label is text, so the meaning never depends on color alone.
export default function StandingBadge({ standing }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-medium ring-1 ring-inset ${STYLES[standing] ?? STYLES.NOT_COMPUTABLE}`}>
      {STANDING_LABELS[standing] ?? standing}
    </span>
  );
}
