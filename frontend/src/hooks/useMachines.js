import { useState, useEffect, useCallback } from "react";
import { SERVERS, PRIMARY_BASE } from "../config/constants";
import { apiFetch } from "../utils/api";

/* ───────────────────────────────────────────────
   HOOK: FETCH MACHINE LIST + PING SERVER HEALTH
─────────────────────────────────────────────── */
export function useMachines() {
  const [machineData, setMachineData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [serverStatuses, setServerStatuses] = useState({ A: "checking", B: "checking" });

  const pingServers = useCallback(async () => {
    const results = await Promise.allSettled(
      Object.entries(SERVERS).map(async ([key, srv]) => {
        try {
          await apiFetch(srv.baseUrl, "/health");
          return [key, "online"];
        } catch {
          return [key, "offline"];
        }
      })
    );

    console.log("Server health:", results);

    const next = {};
    results.forEach((r) => {
      if (r.status === "fulfilled") {
        const [k, s] = r.value;
        next[k] = s;
      }
    });
    setServerStatuses((prev) => ({ ...prev, ...next }));
  }, []);

  const loadMachines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(PRIMARY_BASE, "/machines");

      console.log("Fetched machine data:", data);

      setMachineData(data);
      const firstId = Object.keys(data)[0];
      if (firstId) setSelectedId(firstId);
      setServerStatuses((prev) => ({ ...prev, A: "online" }));
    } catch (err) {
      setError(err.message);
      setServerStatuses((prev) => ({ ...prev, A: "offline" }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMachines();
    pingServers();
  }, [loadMachines, pingServers]);

  return { machineData, loading, error, selectedId, setSelectedId, serverStatuses, loadMachines };
}

