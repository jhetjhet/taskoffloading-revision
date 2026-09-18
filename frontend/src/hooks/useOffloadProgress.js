import { useState, useEffect } from "react";

/* ───────────────────────────────────────────────
   HOOK: SINGLE SOURCE OF TRUTH FOR OFFLOAD PROGRESS %
─────────────────────────────────────────────── */
export function useOffloadProgress(offloading, success) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (offloading) {
      setProgress(5);
      const id = setInterval(() => {
        setProgress((p) => (p < 90 ? p + (90 - p) * 0.08 : p));
      }, 300);
      return () => clearInterval(id);
    }
  }, [offloading]);

  useEffect(() => {
    if (!offloading && success) setProgress(100);
    if (!offloading && !success) setProgress(0);
  }, [offloading, success]);

  return Math.round(progress);
}

