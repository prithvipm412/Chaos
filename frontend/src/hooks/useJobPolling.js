import { useState, useEffect, useRef } from 'react';
import { getJob, ApiError } from '../api';

export function useJobPolling(jobId) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [connectionLost, setConnectionLost] = useState(false);

  const consecutiveFailuresRef = useRef(0);
  const isMountedRef = useRef(true);
  const timerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    consecutiveFailuresRef.current = 0;
    setJob(null);
    setError(null);
    setConnectionLost(false);

    if (!jobId) return;

    let stopped = false;

    async function poll() {
      if (stopped || !isMountedRef.current) return;

      try {
        const data = await getJob(jobId);
        if (!isMountedRef.current || stopped) return;

        consecutiveFailuresRef.current = 0;
        setConnectionLost(false);
        setError(null);
        setJob(data);

        // Continue polling if queued or running
        if (data.status === 'queued' || data.status === 'running') {
          timerRef.current = setTimeout(poll, 1500);
        } else {
          // done or failed -> stop polling
          stopped = true;
        }
      } catch (err) {
        if (!isMountedRef.current || stopped) return;

        if (err instanceof ApiError && err.code === 'NETWORK') {
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= 3) {
            setConnectionLost(true);
          }
          // Back off to 5s poll when connection lost, else 1500ms
          const interval = consecutiveFailuresRef.current >= 3 ? 5000 : 1500;
          timerRef.current = setTimeout(poll, interval);
        } else {
          // Terminal API error (e.g. 404 JOB_NOT_FOUND)
          consecutiveFailuresRef.current = 0;
          setConnectionLost(false);
          setError(err);
          stopped = true;
        }
      }
    }

    poll();

    return () => {
      stopped = true;
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [jobId]);

  return { job, error, connectionLost };
}
