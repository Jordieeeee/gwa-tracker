import { NavLink, Route, Routes, Link } from 'react-router-dom';
import ComputePage from './pages/ComputePage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import RecordPage from './pages/RecordPage.jsx';

const navClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-slate-900">
            GWA Tracker
          </Link>
          <nav aria-label="Main" className="flex gap-1">
            <NavLink to="/" end className={navClass}>
              Compute
            </NavLink>
            <NavLink to="/records" className={navClass}>
              History
            </NavLink>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<ComputePage />} />
          <Route path="/records" element={<HistoryPage />} />
          <Route path="/records/:id" element={<RecordPage />} />
          <Route
            path="*"
            element={
              <div className="py-16 text-center">
                <h1 className="text-xl font-semibold">Page not found</h1>
                <Link to="/" className="mt-4 inline-block text-indigo-700 underline">
                  Go to Compute
                </Link>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-4xl px-4 py-4 text-xs text-slate-500">
          Records are public. Use a nickname and sample grades, never real student numbers. Honors rules are placeholders
          until confirmed against the BatStateU student handbook. IT 412 Platform Technologies final project.
        </p>
      </footer>
    </div>
  );
}
