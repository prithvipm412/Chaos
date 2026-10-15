import React, { useState, useEffect } from 'react';
import UploadScreen from './components/UploadScreen';

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
    <div className="min-h-screen bg-navy-950 text-text flex flex-col antialiased selection:bg-accent/30 selection:text-white">
      <header className="border-b border-navy-800 bg-navy-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a
            href="#/"
            className="flex flex-col hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
          >
            <h1 className="text-xl font-bold tracking-tight text-text">Genome Firewall</h1>
            <p className="text-xs text-text/70">Antibiotic resistance from a bacterial genome, in minutes</p>
          </a>

          {route.name === 'job' && (
            <a
              href="#/"
              className="text-xs font-medium text-accent hover:text-accent/80 transition-colors border border-navy-800 bg-navy-800/40 hover:bg-navy-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              <span>←</span>
              <span>New analysis</span>
            </a>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {route.name === 'upload' ? (
          <UploadScreen />
        ) : (
          <section className="text-center py-20 space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-text">Job {route.jobId}</h2>
            <p className="text-sm text-text/60">Pipeline analysis in progress...</p>
          </section>
        )}
      </main>

      <footer className="border-t border-navy-800/60 py-6 text-center text-xs text-text/40">
        <p>Decision support only — confirm with lab AST. Absence of known genes does not prove susceptibility.</p>
      </footer>
    </div>
  );
}
