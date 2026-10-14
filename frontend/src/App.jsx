import { useEffect, useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 3000);

    async function checkHealth() {
      try {
        const response = await fetch('http://localhost:8000/api/health', {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Health check failed');
        const data = await response.json();
        if (data.ok !== true) throw new Error('Invalid health response');
        if (active) setStatus('connected');
      } catch {
        if (active) setStatus('offline');
      } finally {
        clearTimeout(timeout);
      }
    }

    checkHealth();
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="boilerplate-card w-full max-w-md rounded-2xl border border-navy-800 bg-navy-900 p-10 text-center shadow-xl">
        <h1 className="text-3xl font-semibold tracking-tight">CHAOS boilerplate</h1>
        <p className="mt-4 text-accent" role="status" aria-live="polite">
          Backend: {status}
        </p>
      </section>
    </main>
  );
}
