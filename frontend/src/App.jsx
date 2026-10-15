import React, { useState, useEffect } from 'react';
import UploadScreen from './components/UploadScreen';
import JobScreen from './components/JobScreen';
import { useJobPolling } from './hooks/useJobPolling';

function parseHash(hash) {
  const current = hash || window.location.hash || '#/';
  const match = current.match(/^#\/job\/([^/?#]+)/);
  if (match) {
    return { name: 'job', jobId: match[1] };
  }
  return { name: 'upload' };
}

export default function App() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));

  let lastJobId = null;
  try {
    lastJobId = route.name === 'upload' ? localStorage.getItem('lastJobId') : null;
  } catch { /* Storage may be disabled; direct job URLs still work. */ }
  const { job: lastJob } = useJobPolling(lastJobId);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-bg-page text-text flex flex-col antialiased selection:bg-accent/20 selection:text-accent">
      <header className="bg-[linear-gradient(to_right,var(--header-from),var(--header-to))] shadow-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a
            href="#/"
            className="flex flex-col hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-lg"
          >
            <h1 className="text-2xl font-bold tracking-tight text-white">Genome Firewall</h1>
            <p className="text-xs text-[var(--header-subtitle)]">Antibiotic resistance from a bacterial genome, in minutes</p>
          </a>

          {route.name === 'job' && (
            <a
              href="#/"
              className="text-xs font-medium text-white hover:bg-white/20 transition-colors border border-white/40 bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs"
            >
              <span>←</span>
              <span>New analysis</span>
            </a>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {route.name === 'upload' ? (
          <>
            {lastJob && ['queued', 'running'].includes(lastJob.status) && (
              <a href={`#/job/${encodeURIComponent(lastJob.job_id)}`} className="block mb-6 rounded-xl border border-navy-800 bg-navy-900 p-4 text-sm font-medium text-accent">
                Resume analysis in progress
              </a>
            )}
            <UploadScreen />
          </>
        ) : (
          <JobScreen jobId={route.jobId} />
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-text-secondary">
        <p>Decision support only — confirm with lab AST. Absence of known genes does not prove susceptibility.</p>
      </footer>
    </div>
  );
}
