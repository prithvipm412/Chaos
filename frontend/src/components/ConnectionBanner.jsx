import React, { useEffect, useState } from 'react';

export default function ConnectionBanner({ connectionLost }) {
  const [visible, setVisible] = useState(connectionLost);

  useEffect(() => {
    if (connectionLost) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => setVisible(false), 300);
    return () => clearTimeout(timer);
  }, [connectionLost]);

  if (!connectionLost && !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sticky top-20 z-20 rounded-xl border p-3.5 text-sm transition-opacity duration-300 motion-reduce:transition-none ${connectionLost ? 'opacity-100' : 'opacity-0'}`}
      style={{ color: 'var(--uncertain)', background: 'var(--uncertain-soft)', borderColor: 'var(--uncertain)' }}
    >
      {connectionLost ? 'Connection lost — retrying…' : 'Connection restored'}
    </div>
  );
}
