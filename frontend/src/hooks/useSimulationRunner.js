import { useState } from "react";
import { resolveServer, WORKLOAD_LABELS } from "../config/constants";
import { apiFetch } from "../utils/api";
import { computeGBFS, computePSO } from "../algorithms/simulation";

/* ───────────────────────────────────────────────
   HOOK: ORCHESTRATES RUNNING GBFS+PSO AND THE OFFLOAD
─────────────────────────────────────────────── */
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export function useSimulationRunner({ machine, tasks, workload, setHistory }) {
  const [gbfsData, setGbfsData] = useState(null);
  const [psoData, setPsoData] = useState(null);
  const [algoRunning, setAlgoRunning] = useState(false);
  const [algoError, setAlgoError] = useState(null);
  const [gbfsSim, setGbfsSim] = useState(null);
  const [psoSim, setPsoSim] = useState(null);
  const [gbfsStage, setGbfsStage] = useState(0);
  const [psoIteration, setPsoIteration] = useState(0);
  const [offloadResult, setOffloadResult] = useState(null);
  const [offloading, setOffloading] = useState(false);
  const [offloadError, setOffloadError] = useState(null);

  const revealGBFS = async (result) => {
    setGbfsStage(0);
    await delay(700);
    setGbfsStage(1);
    await delay(1100);
    setGbfsStage(2);
    await delay(1100);
    setGbfsStage(3);
    await delay(900);
    setGbfsStage(4);
    await delay(900);
    setGbfsStage(5);
    setGbfsData(result);
  };

  const revealPSO = async (result) => {
    setPsoIteration(0);
    await delay(700);
    for (let i = 1; i <= result.iterations.length; i++) {
      setPsoIteration(i);
      await delay(1100);
    }
    await delay(600);
    setPsoData(result);
  };

  const offloadTask = async (gbfsOverride, psoOverride) => {
    const g = gbfsOverride ?? gbfsData;
    const p = psoOverride ?? psoData;
    if (!g || !p) return false;
    const gbfsBetter = g.latency <= p.latency;
    const betterApproach = gbfsBetter ? "GBFS" : "PSO";
    const decidedKey = (gbfsBetter ? g : p).recommendedServer;
    const targetSrv = resolveServer(decidedKey);
    const totalTaskSize = tasks.reduce((a, t) => a + t.taskSize, 0);

    setOffloading(true);
    setOffloadError(null);
    try {
      const offloadPayload = {
        machineId: machine.machineId,
        taskSize: +totalTaskSize.toFixed(2),
        algorithm: betterApproach,
        targetServer: targetSrv.label,
        gbfsLatency: g.latency,
        psoLatency: p.latency,
      };
      const MIN_OFFLOAD_DISPLAY_MS = 2600;
      const [result] = await Promise.all([
        apiFetch(targetSrv.baseUrl, "/offload", {
          method: "POST",
          body: JSON.stringify(offloadPayload),
        }),
        delay(MIN_OFFLOAD_DISPLAY_MS),
      ]);

      console.log("Offload payload:", offloadPayload);
      console.log("Offload result:", result);

      setOffloadResult(result);
      setHistory((h) => [
        {
          id: `${Date.now()}`,
          timestamp: new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          machineName: machine.name,
          machineId: machine.machineId,
          workloadName: `${tasks.length}-task batch (${machine.taskType || machine.category || "Standard Load"})`,
          level: workload ? WORKLOAD_LABELS[workload] : "Live",
          algorithm: betterApproach,
          server: targetSrv.label,
          latency: result.measuredLatency,
          status: result.status === "success" ? "Success" : "Failed",
        },
        ...h,
      ]);
      return result.status === "success";
    } catch (err) {
      setOffloadError(err.message);
      return false;
    } finally {
      setOffloading(false);
    }
  };

  const runBothAlgorithms = async ({ onProgress }) => {
    setAlgoRunning(true);
    setAlgoError(null);
    setGbfsData(null);
    setPsoData(null);
    setGbfsSim(null);
    setPsoSim(null);
    setGbfsStage(0);
    setPsoIteration(0);
    try {
      const gbfsResult = computeGBFS(tasks);
      const psoResult = computePSO(tasks);
      setGbfsSim(gbfsResult);
      setPsoSim(psoResult);

      await Promise.all([revealGBFS(gbfsResult), revealPSO(psoResult)]);
      onProgress?.("algorithms-done");

      const success = await offloadTask(gbfsResult, psoResult);
      if (success) onProgress?.("offload-done");
    } catch (err) {
      setAlgoError(err.message);
    } finally {
      setAlgoRunning(false);
    }
  };

  const retryOffload = async ({ onProgress }) => {
    const success = await offloadTask(gbfsData, psoData);
    if (success) onProgress?.("offload-done");
  };

  const resetRun = () => {
    setGbfsData(null);
    setPsoData(null);
    setOffloadResult(null);
    setGbfsSim(null);
    setPsoSim(null);
    setGbfsStage(0);
    setPsoIteration(0);
    setAlgoError(null);
    setOffloadError(null);
  };

  return {
    gbfsData, psoData, algoRunning, algoError,
    gbfsSim, psoSim, gbfsStage, psoIteration,
    offloadResult, offloading, offloadError,
    runBothAlgorithms, retryOffload, resetRun,
  };
}

